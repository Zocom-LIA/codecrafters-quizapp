import json
import uuid
from datetime import datetime
import random
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr

# True for now as we need to test it in locally first
if False:
    dynamodb = boto3.resource(
        'dynamodb', endpoint_url='http://localhost:8000/')
else:
    dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('QuizTable')

# DynamoDB often returns numeric fields as Decimal objects when using Python's boto3 library.
# These Decimal objects are not directly serializable into JSON.
# We use a helper function to convert Decimal to int/float.


def convert_decimal(obj):
    if isinstance(obj, list):
        return [convert_decimal(item) for item in obj]
    if isinstance(obj, dict):
        return {key: convert_decimal(value) for key, value in obj.items()}
    if isinstance(obj, Decimal):
        # Convert Decimal to int if it's an integer value, otherwise float
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj


def create_user_attempt(event, context):
    data = json.loads(event['body'])
    user_attempt_id = str(uuid.uuid4())
    quiz_id = data['quizId']
    user_id = data['userId']

    # Fetch all questions for the quiz
    response = table.query(
        KeyConditionExpression=Key('PK').eq(
            f"QUIZ#{quiz_id}") & Key('SK').begins_with("QUESTION#")
    )
    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'No questions found for the quiz'})
        }

    # Generate question order
    question_order = [item['SK'].split('#')[1] for item in items]
    random.shuffle(question_order)

    # Create UserAttempt with question order
    table.put_item(
        Item={
            'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
            'SK': f"ATTEMPT#{user_attempt_id}",
            "score": 0,
            "dateStarted": str(datetime.now()),
            "dateFinished": None,
            'userId': user_id,  # Add for GSI
            'quizId': quiz_id,  # Add for GSI
            "questionOrder": question_order,
            "currentQuestionId": question_order[0],
            "progress": 0
        }
    )

    return {
        'statusCode': 201,
        'body': json.dumps({
            'message': 'User attempt created successfully',
            'userAttemptId': user_attempt_id})
    }


def get_user_attempt(event, context):
    data = event['pathParameters']
    user_id = data['userId']
    quiz_id = data['quizId']
    attempt_id = data['attemptId']

    # Fetch the user attempt
    response = table.get_item(
        Key={
            'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
            'SK': f"ATTEMPT#{attempt_id}"
        }
    )

    attempt = response.get('Item')

    if not attempt:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User attempt not found'})
        }

    # Convert Decimals to standard Python types
    attempt = convert_decimal(attempt)

    # Calculate time taken if dateFinished exists
    date_started = datetime.fromisoformat(attempt['dateStarted'])
    date_finished = attempt.get('dateFinished')
    time_taken = None

    if date_finished:
        date_finished = datetime.fromisoformat(date_finished)
        time_delta = date_finished - date_started
        time_taken = {
            'minutes': time_delta.seconds // 60,
            'seconds': time_delta.seconds % 60
        }

    # Return attempt details
    return {
        'statusCode': 200,
        'body': json.dumps({
            'userId': user_id,
            'quizId': quiz_id,
            'attemptId': attempt_id,
            'score': attempt.get('score', 0),
            'dateStarted': attempt['dateStarted'],
            'dateFinished': attempt.get('dateFinished'),
            'timeTaken': time_taken,
            'questionOrder': attempt.get('questionOrder', []),
            'currentQuestionId': attempt.get('currentQuestionId'),
            'progress': attempt.get('progress', 0)
        })
    }


def list_user_attempts(event, context):
    user_id = event['pathParameters']['userId']

    # Query all quiz attempts for the user using the GSI
    response = table.query(
        IndexName='UserAttemptsIndex',
        KeyConditionExpression=Key('userId').eq(user_id)
    )

    attempts = response.get('Items', [])

    # Filter out attempts where 'dateFinished' is missing or invalid
    completed_attempts = [
        attempt for attempt in attempts
        if isinstance(attempt.get('dateFinished'), str)
    ]

    # Convert Decimals and calculate time taken
    completed_attempts = convert_decimal(completed_attempts)
    for attempt in completed_attempts:
        date_started = datetime.fromisoformat(attempt['dateStarted'])
        date_finished = datetime.fromisoformat(attempt['dateFinished'])

        time_delta = date_finished - date_started
        attempt['timeTaken'] = {
            'minutes': time_delta.seconds // 60,
            'seconds': time_delta.seconds % 60
        }

        # Extract attemptId from SK and add it to the response
        if 'SK' in attempt and attempt['SK'].startswith('ATTEMPT#'):
            attempt['attemptId'] = attempt['SK'].split('#')[1]

    return {
        'statusCode': 200,
        'body': json.dumps({'attempts': completed_attempts})
    }


def get_user_attempt_details(event, context):
    attempt_id = event['pathParameters']['attemptId']

    response = table.scan(
        FilterExpression=Key('SK').eq(f"ATTEMPT#{attempt_id}")
    )
    items = response.get('Items', [])
    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Attempt not found'})
        }

    attempt = items[0]
    attempt = convert_decimal(attempt)
    return {
        'statusCode': 200,
        'body': json.dumps({
            'userId': attempt['userId'],
            'quizId': attempt['quizId'],
            'dateStarted': attempt['dateStarted'],
            'dateFinished': attempt['dateFinished'],
            'score': attempt['score']
        })
    }


def update_user_attempt(event, context):
    data = json.loads(event['body'])
    user_id = event['pathParameters']['userId']
    quiz_id = event['pathParameters']['quizId']
    attempt_id = event['pathParameters']['attemptId']

    # Prepare update expressions
    update_expression = []
    expression_attribute_values = {}
    expression_attribute_names = {}

    if 'score' in data:
        update_expression.append('#score = :score')
        expression_attribute_values[':score'] = data['score']
        expression_attribute_names['#score'] = 'score'

    if 'dateFinished' in data:
        update_expression.append('#dateFinished = :dateFinished')
        expression_attribute_values[':dateFinished'] = data['dateFinished']
        expression_attribute_names['#dateFinished'] = 'dateFinished'

    if 'currentQuestionId' in data:
        update_expression.append('#currentQuestionId = :currentQuestionId')
        expression_attribute_values[':currentQuestionId'] = data['currentQuestionId']
        expression_attribute_names['#currentQuestionId'] = 'currentQuestionId'

    if 'progress' in data:
        update_expression.append('#progress = :progress')
        expression_attribute_values[':progress'] = data['progress']
        expression_attribute_names['#progress'] = 'progress'

    if 'questionOrder' in data:
        update_expression.append('#questionOrder = :questionOrder')
        expression_attribute_values[':questionOrder'] = data['questionOrder']
        expression_attribute_names['#questionOrder'] = 'questionOrder'

    if not update_expression:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'No valid attributes to update'})
        }

    # Perform the update
    table.update_item(
        Key={
            'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
            'SK': f"ATTEMPT#{attempt_id}"
        },
        UpdateExpression=f"SET {', '.join(update_expression)}",
        ExpressionAttributeValues=expression_attribute_values,
        ExpressionAttributeNames=expression_attribute_names
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'User attempt updated successfully'})
    }


def get_current_question(event, context):
    data = event['pathParameters']
    user_id = data['userId']
    quiz_id = data['quizId']
    attempt_id = data['attemptId']

    # Fetch the user attempt
    response = table.get_item(
        Key={
            'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
            'SK': f"ATTEMPT#{attempt_id}"
        }
    )
    attempt = response.get('Item')

    if not attempt:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User attempt not found'})
        }

    current_question_id = attempt.get('currentQuestionId')
    progress = int(attempt.get('progress', 0))
    question_order = attempt.get('questionOrder', [])
    total_questions = len(question_order)

    # Fetch the current question
    question_response = table.get_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': f"QUESTION#{current_question_id}"
        }
    )
    question = question_response.get('Item')

    if not question:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Current question not found'})
        }

    # Return unified response
    return {
        'statusCode': 200,
        'body': json.dumps({
            'questionId': current_question_id,
            'questionText': question.get('questionText', 'No text available'),
            'options': question.get('options', []),
            'currentNumber': progress + 1,  # 1-based index
            'totalQuestions': total_questions
        })
    }


def move_to_next_question(event, context):
    try:
        data = json.loads(event['body'])
        user_id = data.get('userId')
        quiz_id = data.get('quizId')
        attempt_id = data.get('attemptId')

        if not user_id or not quiz_id or not attempt_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing required parameters: userId, quizId, or attemptId'})
            }

        # Fetch the current user attempt
        response = table.get_item(
            Key={
                'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
                'SK': f"ATTEMPT#{attempt_id}"
            }
        )
        attempt = response.get('Item')

        if not attempt:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'User attempt not found'})
            }

        progress = int(attempt.get('progress', 0))
        question_order = attempt.get('questionOrder', [])
        total_questions = len(question_order)

        if not question_order:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Question order is empty or not defined'})
            }

        if progress + 1 < len(question_order):
            next_question_id = question_order[progress + 1]
            table.update_item(
                Key={
                    'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
                    'SK': f"ATTEMPT#{attempt_id}"
                },
                UpdateExpression="SET progress = :progress, currentQuestionId = :currentQuestionId",
                ExpressionAttributeValues={
                    ':progress': progress + 1,
                    ':currentQuestionId': next_question_id
                }
            )
        else:
            next_question_id = None
            table.update_item(
                Key={
                    'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
                    'SK': f"ATTEMPT#{attempt_id}"
                },
                UpdateExpression="SET dateFinished = :dateFinished",
                ExpressionAttributeValues={
                    ':dateFinished': str(datetime.now())
                }
            )
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Quiz completed',
                    'nextQuestionId': None
                })
            }

        # Fetch the next question details
        question_response = table.get_item(
            Key={
                'PK': f"QUIZ#{quiz_id}",
                'SK': f"QUESTION#{next_question_id}"
            }
        )
        question = question_response.get('Item')

        if not question:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'Next question not found'})
            }

        print(f"Progress: {progress}, Question Order: {question_order}")
        print(f"Next Question ID: {next_question_id}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'questionId': next_question_id,
                'questionText': question.get('questionText', 'No text available'),
                'options': question.get('options', []),
                'currentNumber': progress + 2,  # Increment progress for 1-based index
                'totalQuestions': total_questions
            })
        }
    except Exception as e:
        print(f"Error in move_to_next_question: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error'})
        }

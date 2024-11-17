import json
import boto3
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr

# True for now as we need to test it in locally first
if False:
    dynamodb = boto3.resource(
        'dynamodb', endpoint_url='http://localhost:8000/')
else:
    dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('QuizTable')


def create_user_attempt(event, context):
    data = json.loads(event['body'])

    user_attempt_id = str(uuid.uuid4())
    quiz_id = data['quizId']

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
    question_order.sort()  # Replace with random.shuffle(question_order) for random order

    # Create UserAttempt with question order
    table.put_item(
        Item={
            'PK': f"USER#{data['userId']}#QUIZ#{quiz_id}",
            'SK': f"ATTEMPT#{user_attempt_id}",
            "score": 0,
            "dateStarted": str(datetime.now()),
            "dateFinished": None,
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

    # Return all fields, including state-tracking attributes
    return {
        'statusCode': 200,
        'body': json.dumps({
            'userId': user_id,
            'quizId': quiz_id,
            'attemptId': attempt_id,
            'score': attempt['score'],
            'dateStarted': attempt['dateStarted'],
            'dateFinished': attempt.get('dateFinished'),
            'questionOrder': attempt['questionOrder'],
            'currentQuestionId': attempt['currentQuestionId'],
            'progress': attempt['progress']
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

    current_question_id = attempt['currentQuestionId']

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

    # Exclude sensitive information
    return {
        'statusCode': 200,
        'body': json.dumps({
            'questionId': question['SK'].split('#')[1],
            'questionText': question['questionText'],
            'options': question['options']
        })
    }


def move_to_next_question(event, context):
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

    question_order = attempt.get('questionOrder', [])
    progress = attempt.get('progress', 0)

    # Check if there are more questions
    if progress + 1 >= len(question_order):
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'No more questions'})
        }

    # Determine the next question
    next_question_id = question_order[progress + 1]
    new_progress = progress + 1

    # Update the UserAttempt with the new question and progress
    table.update_item(
        Key={
            'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
            'SK': f"ATTEMPT#{attempt_id}"
        },
        UpdateExpression="SET currentQuestionId = :currentQuestionId, progress = :progress",
        ExpressionAttributeValues={
            ':currentQuestionId': next_question_id,
            ':progress': new_progress
        }
    )

    # Fetch the details of the next question
    question_response = table.get_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': f"QUESTION#{next_question_id}"
        }
    )
    next_question = question_response.get('Item')

    if not next_question:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Next question not found'})
        }

    # Return the next question details (excluding sensitive information like the correct answer)
    return {
        'statusCode': 200,
        'body': json.dumps({
            'questionId': next_question['SK'].split('#')[1],
            'questionText': next_question['questionText'],
            'options': next_question['options']
        })
    }

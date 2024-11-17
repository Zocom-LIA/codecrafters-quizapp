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


def create_user(event, context):
    data = json.loads(event['body'])

    user_id = str(uuid.uuid4())

    table.put_item(
        Item={
            'PK': f"USER#{user_id}",
            'SK': 'METADATA',
            'userName': data['userName'],
            "fullName": data['fullName'],
            "email": data['email'],
            "role": data['role']
        }
    )

    created_user = {
        'userId': user_id,
        'userName': data['userName'],
        "fullName": data['fullName'],
        "email": data['email'],
        "role": data['role']

    }

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'User created successfully', 'user': created_user})
    }


def get_user_by_id(event, context):
    user_id = event['pathParameters']['userId']

    response = table.query(
        KeyConditionExpression=Key('PK').eq(
            f"USER#{user_id}") & Key('SK').eq("METADATA")
    )

    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User not found'})
        }

    user_metadata = next(
        (item for item in items if item['SK'] == 'METADATA'), None)

    if not user_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User metadata not found'})
        }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'userId': user_id,
            'userName': user_metadata['userName'],
            "fullName": user_metadata['fullName'],
            "email": user_metadata['email'],
            "role": user_metadata['role']
        })
    }


def get_all_users(event, context):
    response = table.scan(
        FilterExpression=Attr("SK").eq("METADATA")
        & Attr("PK").contains("USER#")
    )

    items = response.get('Items', [])
    users = []
    for item in items:
        users.append({
            'userId': item['PK'].split('#')[1],
            'userName': item['userName'],
            "fullName": item['fullName'],
            "email": item['email'],
            "role": item['role']
        })

    return {
        'statusCode': 200,
        'body': json.dumps({'users': users})
    }


def update_user(event, context):
    user_id = event['pathParameters']['userId']
    data = json.loads(event['body'])

    # Check if the user exists
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f"USER#{user_id}")
    )
    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User not found'})
        }

    user_metadata = next(
        (item for item in items if item['SK'] == 'METADATA'), None)

    if not user_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User metadata not found'})
        }

    # Update the user data
    table.update_item(
        Key={
            'PK': f"USER#{user_id}",
            'SK': 'METADATA'
        },
        UpdateExpression='SET #userName = :userName, #fullName = :fullName, #email = :email, #role = :role',
        ExpressionAttributeNames={
            '#userName': 'userName',
            '#fullName': 'fullName',
            '#email': 'email',
            '#role': 'role'
        },
        ExpressionAttributeValues={
            ':userName': data.get('userName'),
            ':fullName': data.get('fullName'),
            ':email': data.get('email'),
            ':role': data.get('role')
        }
    )

    updated_user = {
        'userId': user_id,
        'userName': user_metadata.get('userName') or data.get('userName'),
        'fullName': user_metadata.get('fullName') or data.get('fullName'),
        'email': user_metadata.get('email') or data.get('email'),
        'role': user_metadata.get('role') or data.get('role')
    }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'User updated successfully',
            'user': updated_user
        })
    }


def delete_user(event, context):
    user_id = event['pathParameters']['userId']

    # Check if the user exists
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f"USER#{user_id}")
    )
    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User not found'})
        }

    user_metadata = next(
        (item for item in items if item['SK'] == 'METADATA'), None)

    if not user_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User metadata not found'})
        }

    # Delete the user
    table.delete_item(
        Key={
            'PK': f"USER#{user_id}",
            'SK': 'METADATA'
        }
    )

    return {
        'statusCode': 204,
        'body': json.dumps({'message': 'User deleted successfully'})
    }


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


def create_user_answer(event, context):
    data = json.loads(event['body'])

    user_id = data['userId']
    quiz_id = data['quizId']
    attempt_id = data['attemptId']
    question_id = data['questionId']
    user_answer = data['userAnswer']
    status = data['status']

    table.put_item(
        Item={
            'PK': f"USER#{user_id}#QUIZ#{quiz_id}#ATTEMPT#{attempt_id}",
            'SK': f"QUESTION#{question_id}",
            'userAnswer': user_answer,
            'status': status
        }
    )

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'User answer created successfully'})
    }


def get_user_answers(event, context):
    data = event['pathParameters']
    user_id = data['userId']
    quiz_id = data['quizId']
    attempt_id = data['attemptId']

    response = table.query(
        KeyConditionExpression=Key('PK').eq(
            f"USER#{user_id}#QUIZ#{quiz_id}#ATTEMPT#{attempt_id}"
        ) & Key('SK').begins_with("QUESTION#")
    )

    items = response.get('Items', [])

    answers = [{
        'questionId': item['SK'].split('#')[1],
        'userAnswer': item['userAnswer'],
        'status': item['status']
    } for item in items]

    return {
        'statusCode': 200,
        'body': json.dumps({'answers': answers})
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

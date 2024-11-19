import json
import boto3
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr
from attempt import convert_decimal

# True for now as we need to test it in locally first
if False:
    dynamodb = boto3.resource(
        'dynamodb', endpoint_url='http://localhost:8000/')
else:
    dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('QuizTable')


def create_user_answer(event, context):
    data = json.loads(event['body'])
    user_id = data['userId']
    quiz_id = data['quizId']
    attempt_id = data['attemptId']
    question_id = data['questionId']
    user_answer = data['userAnswer']

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

    # Ensure the answer corresponds to the current question
    if question_id != attempt['currentQuestionId']:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Answer is for an invalid question'})
        }

    # Fetch the correct answer for the question
    question_response = table.get_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': f"QUESTION#{question_id}"
        }
    )
    question = question_response.get('Item')

    if not question:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Question not found'})
        }

    # Check if the user's answer is correct
    correct_answer = question['correctAnswer']
    status = 'pass' if user_answer == correct_answer else 'fail'

    # Update the score if the answer is correct
    if status == 'pass':
        table.update_item(
            Key={
                'PK': f"USER#{user_id}#QUIZ#{quiz_id}",
                'SK': f"ATTEMPT#{attempt_id}"
            },
            UpdateExpression="SET score = if_not_exists(score, :start) + :increment",
            ExpressionAttributeValues={
                ':start': 0,  # Initialize score if it doesn't exist
                ':increment': 100
            }
        )

    # Store the answer in the database
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
        'body': json.dumps({'message': 'User answer created successfully', 'status': status, 'correctAnswers': correct_answer})
    }


def get_user_answers(event, context):
    data = event['pathParameters']
    user_id = data['userId']
    quiz_id = data['quizId']
    attempt_id = data['attemptId']

    # Query all answers for the given attempt
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f"USER#{user_id}#QUIZ#{
            quiz_id}#ATTEMPT#{attempt_id}")
    )

    answers = response.get('Items', [])

    # Fetch question details for each answer
    for answer in answers:
        question_id = answer['SK'].split('#')[1]

        # Fetch the question from the database
        question_response = table.get_item(
            Key={
                'PK': f"QUIZ#{quiz_id}",
                'SK': f"QUESTION#{question_id}"
            }
        )
        question = question_response.get('Item')

        # Include question text and correct answer in the response
        if question:
            answer['questionText'] = question['questionText']
            answer['correctAnswer'] = question['correctAnswer']

    # Convert Decimals to JSON-serializable types
    answers = convert_decimal(answers)

    return {
        'statusCode': 200,
        'body': json.dumps({'answers': answers})
    }

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


def create_question(event, context):
    data = json.loads(event['body'])
    quiz_id = event['pathParameters']['quizId']
    question_id = str(uuid.uuid4())

    table.put_item(
        Item={
            'PK': f"QUIZ#{quiz_id}",
            'SK': f"QUESTION#{question_id}",
            'questionText': data['questionText'],
            'options': data['options'],  # Assuming options is a list
            'correctAnswer': data['correctAnswer']
        }
    )

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Question created successfully', 'questionId': question_id})
    }


def get_questions_by_quiz(event, context):
    quiz_id = event['pathParameters']['quizId']

    response = table.query(
        KeyConditionExpression=Key('PK').eq(
            f"QUIZ#{quiz_id}") & Key('SK').begins_with("QUESTION#")
    )

    items = response.get('Items', [])
    questions = [
        {
            'questionId': item['SK'].split('#')[1],
            'questionText': item['questionText'],
            'options': item['options'],
            'correctAnswer': item['correctAnswer']
        }
        for item in items]

    return {
        'statusCode': 200,
        'body': json.dumps({'questions': questions})
    }


def update_question(event, context):
    quiz_id = event['pathParameters']['quizId']
    question_id = event['pathParameters']['questionId']
    data = json.loads(event['body'])

    # Update question in the table
    table.update_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': f"QUESTION#{question_id}"
        },
        UpdateExpression='SET #qt = :qt, #opt = :opt, #ans = :ans',
        ExpressionAttributeNames={
            '#qt': 'questionText',
            '#opt': 'options',
            '#ans': 'correctAnswer'
        },
        ExpressionAttributeValues={
            ':qt': data['questionText'],
            ':opt': data['options'],
            ':ans': data['correctAnswer']
        }
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Question updated successfully'})
    }


def delete_question(event, context):
    quiz_id = event['pathParameters']['quizId']
    question_id = event['pathParameters']['questionId']

    # Delete the question
    table.delete_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': f"QUESTION#{question_id}"
        }
    )

    return {
        'statusCode': 204,
        'body': json.dumps({'message': 'Question deleted successfully'})
    }

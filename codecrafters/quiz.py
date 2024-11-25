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


def create_quiz(event, context):
    data = json.loads(event['body'])

    quiz_id = str(uuid.uuid4())

    table.put_item(
        Item={
            'PK': f"QUIZ#{quiz_id}",
            'SK': 'METADATA',
            'title': data['title'],
            'description': data['description'],
            'visible': True  # Add visible attribute
        }
    )

    created_quiz = {
        'quizId': quiz_id,
        'title': data['title'],
        'description': data['description'],
        'visible': True
    }

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Quiz created successfully', 'quiz': created_quiz})
    }


def get_quiz_by_id(event, context):
    quiz_id = event['pathParameters']['quizId']

    # Fetch quiz metadata
    response = table.query(
        KeyConditionExpression=Key('PK').eq(
            f"QUIZ#{quiz_id}") & Key('SK').eq("METADATA")
    )
    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz not found'})
        }

    quiz_metadata = next(
        (item for item in items if item['SK'] == 'METADATA'), None)

    if not quiz_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz metadata not found'})
        }

    # Fetch question count
    question_response = table.query(
        KeyConditionExpression=Key('PK').eq(
            f"QUIZ#{quiz_id}") & Key('SK').begins_with("QUESTION#")
    )
    question_count = len(question_response.get('Items', []))

    return {
        'statusCode': 200,
        'body': json.dumps({
            'quizId': quiz_id,
            'title': quiz_metadata['title'],
            'description': quiz_metadata['description'],
            'questionCount': question_count
        })
    }


def get_all_quizzes(event, context):
    response = table.scan(
        FilterExpression=Attr("SK").eq("METADATA")
        & Attr("PK").contains("QUIZ#")
        & Attr("visible").eq(True)  # Include only visible quizzes
    )

    items = response.get('Items', [])
    quizzes = []
    for item in items:
        quizzes.append({
            'quizId': item['PK'].split('#')[1],
            'title': item['title'],
            'description': item['description']
        })

    return {
        'statusCode': 200,
        'body': json.dumps({'quizzes': quizzes})
    }


def update_quiz(event, context):
    quiz_id = event['pathParameters']['quizId']
    data = json.loads(event['body'])

    # Check if the quiz exists
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f"QUIZ#{quiz_id}")
    )
    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz not found'})
        }

    quiz_metadata = next(
        (item for item in items if item['SK'] == 'METADATA'), None)

    if not quiz_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz metadata not found'})
        }

    # Update the quiz data
    table.update_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': 'METADATA'
        },
        UpdateExpression='SET #title = :title, #description = :description',
        ExpressionAttributeNames={
            '#title': 'title',
            '#description': 'description'
        },
        ExpressionAttributeValues={
            ':title': data.get('title'),
            ':description': data.get('description')
        }
    )

    updated_quiz = {
        'quizId': quiz_id,
        'title': quiz_metadata.get('title') or data.get('title'),
        'description': quiz_metadata.get('description') or data.get('description')
    }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Quiz updated successfully',
            'quiz': updated_quiz
        })
    }


def update_quiz_visibility(event, context):
    quiz_id = event['pathParameters']['quizId']
    data = json.loads(event['body'])

    visible = data.get('visible', True)  # Default to true if not provided

    # Update the visibility attribute
    table.update_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': 'METADATA'
        },
        UpdateExpression="SET visible = :visible",
        ExpressionAttributeValues={
            ':visible': visible
        }
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'Quiz visibility updated to {visible}'})
    }


def delete_quiz(event, context):
    quiz_id = event['pathParameters']['quizId']

    # Check if the quiz exists
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f"QUIZ#{quiz_id}")
    )
    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz not found'})
        }

    # Delete all associated questions
    for item in items:
        table.delete_item(
            Key={
                'PK': item['PK'],
                'SK': item['SK']
            }
        )

    return {
        'statusCode': 204,
        'body': json.dumps({'message': 'Quiz and associated questions deleted successfully'})
    }

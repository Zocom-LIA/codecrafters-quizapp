import json
import boto3
import uuid
from boto3.dynamodb.conditions import Key


# True for now as we need to test it in locally first
if False:
    dynamodb = boto3.resource('dynamodb', endpoint_url='http://localhost:8000/')
else:
    dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('QuizTable')

def seed_data(event, context):
    # To create the table locally use the below
    # aws dynamodb create-table --table-name QuizTable --attribute-definitions AttributeName=quizId,AttributeType=S --key-schema AttributeName=quizId,KeyType=HASH --endpoint-url http://localhost:8000 --billing-mode PAY_PER_REQUEST
    # To download the dynamo db locally from here(https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html) use the below
    # docker run -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -inMemory -sharedDb

    # Sample Quizzes
    quizzes = [
        {
            "quizId": str(uuid.uuid4()),
            "title": "Python Basics",
            "description": "A quiz on basic Python concepts."
        },
        {
            "quizId": str(uuid.uuid4()),
            "title": "AWS Fundamentals",
            "description": "A quiz on AWS core services."
        }
    ]

    # Insert Quizzes
    for quiz in quizzes:
        table.put_item(
            Item={
                'PK': f"QUIZ#{quiz['quizId']}",
                'SK': f"METADATA",
                'title': quiz['title'],
                'description': quiz['description']
            }
        )

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Data seeded successfully'})
    }


def seed_data_questions(event, context):

    # Sample Quizzes
    questions= [
        {
           "quizId": str(uuid.uuid4()), 
           "questionId": str(uuid.uuid4()),
           "questionText": "What is the keyword used to define a function in Python?",
           "type": "multiple choice",
           "correctAnswer": "answerID"
        }
    ]
  

# Insert Questions for each Quiz
    for question in questions:
        table.put_item(
            Item={
                'PK': f"QUIZ#{question['quizId']}",
                'SK': f"QUESTION#{question['questionId']}",
                'questionText': question['questionText'],
                'type': question['type'],
                'correctAnswer': question['correctAnswer']
            }
        )

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Questions seeded successfully'})
    }



def create_quiz(event, context):
    data = json.loads(event['body'])

    quiz_id = str(uuid.uuid4())

    table.put_item(
        Item={
            'PK': f"QUIZ#{quiz_id}",
            'SK': 'METADATA',
            'title': data['title'],
            'description': data['description']
        }
    )

    created_quiz = {
        'quizId': quiz_id,
        'title': data['title'],
        'description': data['description']
    }

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Quiz created successfully', 'quiz': created_quiz})
    }


def get_quiz_by_id(event, context):
    quiz_id = event['pathParameters']['quizId']

    response = table.query(
        KeyConditionExpression=Key('PK').eq(f"QUIZ#{quiz_id}")
    )

    items = response.get('Items', [])

    if not items:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz not found'})
        }

    quiz_metadata = next((item for item in items if item['SK'] == 'METADATA'), None)

    if not quiz_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz metadata not found'})
        }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'quizId': quiz_id,
            'title': quiz_metadata['title'],
            'description': quiz_metadata['description'],
        })
    }

def get_all_quizzes(event, context):
    response = table.scan(
        FilterExpression="SK = :metadata",
        ExpressionAttributeValues={":metadata": "METADATA"}
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

    quiz_metadata = next((item for item in items if item['SK'] == 'METADATA'), None)

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

    quiz_metadata = next((item for item in items if item['SK'] == 'METADATA'), None)

    if not quiz_metadata:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Quiz metadata not found'})
        }

    # Delete the quiz
    table.delete_item(
        Key={
            'PK': f"QUIZ#{quiz_id}",
            'SK': 'METADATA'
        }
    )

    return {
        'statusCode': 204,
        'body': json.dumps({'message': 'Quiz deleted successfully'})
    }


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
        KeyConditionExpression=Key('PK').eq(f"QUIZ#{quiz_id}") & Key('SK').begins_with("QUESTION#")
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



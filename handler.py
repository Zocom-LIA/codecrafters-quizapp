import json
import boto3
import uuid
from boto3.dynamodb.conditions import Key


# True for now as we need to test it in locally first
if True:
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

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Quiz created successfully'})
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

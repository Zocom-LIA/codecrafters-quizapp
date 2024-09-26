import json
import boto3

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
            "quizId": "1",
            "title": "Python Basics",
            "description": "A quiz on basic Python concepts."
        },
        {
            "quizId": "2",
            "title": "AWS Fundamentals",
            "description": "A quiz on AWS core services."
        }
    ]

    # Insert Quizzes
    for quiz in quizzes:
        table.put_item(Item=quiz)

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Data seeded successfully'})
    }



def create_quiz(event, context):
    data = json.loads(event['body'])
    quizId = data['quizId']
    title = data['title']
    description = data['description']

    table.put_item(
        Item={
            'quizId': quizId,
            'title': title,
            'description': description
        }
    )

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Quiz created successfully'})
    }


def get_quiz_by_id(event, context):
    quizId = event['pathParameters']['quizId']

    response = table.get_item(
        Key={'quizId': quizId}
    )

    item = response.get('Item')
    if item:
        return {
            'statusCode': 200,
            'body': json.dumps(item)
        }
    else:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Quiz not found'})
        }


def get_all_quizzes(event, context):
    response = table.scan()
    return {
        'statusCode': 200,
        'body': json.dumps(response['Items'])
    }

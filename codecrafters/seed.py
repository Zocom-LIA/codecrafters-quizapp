import json
import boto3
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr

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

    userId = str(uuid.uuid4())
    quizId = str(uuid.uuid4())
    attemptId = str(uuid.uuid4())

    # Sample Users
    users = [
        {
            "userId": userId,
            "userName": "student1",
            "fullName": "Student 1",
            "email": "student1@email.com",
            "role": "student",
        },
        {
            "userId": str(uuid.uuid4()),
            "userName": "teacher1",
            "fullName": "Teacher 1",
            "email": "teacher1@email.com",
            "role": "teacher",
        },
    ]
    # Insert Users
    for user in users:
        table.put_item(
            Item={
                "PK": f"USER#{user['userId']}",
                "SK": f"METADATA",
                "userName": user["userName"],
                "fullName": user["fullName"],
                "email": user["email"],
                "role": user["role"]
            }
        )

    # Sample Quizzes
    quizzes = [
        {
            "quizId": quizId,
            "title": "Python Basics",
            "description": "A quiz on basic Python concepts.",
        },
        {
            "quizId": str(uuid.uuid4()),
            "title": "AWS Fundamentals",
            "description": "A quiz on AWS core services.",
        },
    ]
    # Insert Quizzes
    for quiz in quizzes:
        table.put_item(
            Item={
                "PK": f"QUIZ#{quiz['quizId']}",
                "SK": f"METADATA",
                "title": quiz["title"],
                "description": quiz["description"],
            }
        )

    # Sample Quizzes
    questions = [
        {
            "quizId": quizId,
            "questionId": str(uuid.uuid4()),
            "questionText": "What is the keyword used to define a function in Python?",
            "type": "single choice",
            "options": ["function", "def", "func", "define"],
            "correctAnswer": "def",
        }
    ]
    # Insert Questions for each Quiz
    for question in questions:
        table.put_item(
            Item={
                "PK": f"QUIZ#{question['quizId']}",
                "SK": f"QUESTION#{question['questionId']}",
                "questionText": question["questionText"],
                "type": question["type"],
                "options": question["options"],
                "correctAnswer": question["correctAnswer"],
            }
        )

    # Sample UserAnswers
    userAnswers = list(
        map(
            lambda question: {
                "PK": f"USER#{userId}#ATTEMPT#{attemptId}#QUIZ#{quizId}",
                "SK": f"QUESTION#{question['questionId']}",
                "userAnswer": "def",
                "status": "pass",
                "timestamp": str(datetime.now()),
            },
            questions,
        )
    )
    # Insert UserAnswers
    for userAnswer in userAnswers:
        table.put_item(
            Item={
                "PK": userAnswer["PK"],
                "SK": userAnswer["SK"],
                "userAnswer": userAnswer["userAnswer"],
                "status": userAnswer["status"],
                "timestamp": userAnswer["timestamp"],
            }
        )

    # Sample UserAttempt
    userAttempts = [
        {
            "PK": f"USER#{userId}#QUIZ#{quizId}",
            "SK": f"ATTEMPT#{attemptId}",
            "score": "100",
        }
    ]
    # Insert UserAttempt
    for userAttemp in userAttempts:
        table.put_item(
            Item={
                "PK": userAttemp["PK"],
                "SK": userAttemp["SK"],
                "score": userAttemp["score"],
            }
        )

    return {
        "statusCode": 201,
        "body": json.dumps({"message": "Data seeded successfully"}),
    }


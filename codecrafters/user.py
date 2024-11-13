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

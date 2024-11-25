import boto3

dynamodb = boto3.resource('dynamodb')
table_name = 'QuizTable'  # Replace with your actual table name
table = dynamodb.Table(table_name)


def handler(event, context):
    try:
        # Scan to fetch all items
        response = table.scan()
        items = response['Items']

        for item in items:
            if item['PK'].startswith('USER#') and item['SK'].startswith('ATTEMPT#'):
                # Parse userId and quizId from PK
                user_id = item['PK'].split('#')[1]
                quiz_id = item['PK'].split('#')[3]

                # Add userId and quizId attributes
                table.update_item(
                    Key={
                        'PK': item['PK'],
                        'SK': item['SK']
                    },
                    UpdateExpression="SET userId = :userId, quizId = :quizId",
                    ExpressionAttributeValues={
                        ':userId': user_id,
                        ':quizId': quiz_id
                    }
                )

        return {
            'statusCode': 200,
            'body': "Backfill completed successfully."
        }

    except Exception as e:
        print(f"Error running backfill: {str(e)}")
        return {
            'statusCode': 500,
            'body': f"Error running backfill: {str(e)}"
        }

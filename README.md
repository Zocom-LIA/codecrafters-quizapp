# AWS Serverless Python CRUD API
Quiz web app built with the serverless framework and AWS services.

The purpose of the project is to help IT students test and expand their knowledge on IT concepts, including programming languages. It achieves that by offering a classroom environment where teachers can create quizzes and students can take the quiz and compare their progress to other participants per question, as well as in total score.

<br>

## Technologies
In this project, the following technologies are used:

![Graph of technologies used in the project. These are described in the following text.][img-project-technologies]

- *AWS DynamoDB*, which is used for storing the app data, like quizzes, questions, users and scores in a table.
- *AWS Lambda* functions for performing CRUD operations in the DynamoDB table.
- AWS API Gateway for setting up the API endpoints for calling these lambda functions.
- S3 for storing and serving the frontend to the user.
- All of the above are managed with the Serverless Framework and Boto3 (the AWS SDK for Python).
- For the frontend, HTML, CSS and Javascript are used.

<br>

## Endpoints
In the beginning of the following endpoints, the base URL should be added which has the following format:  
`https://{uniqueID}.execute-api.{region}.amazonaws.com/dev`

### Quiz
- **Seed quiz data (POST):** `/seed`
- **Create quiz (POST):** `/quiz`
- **Get quiz by ID (GET):** `/quiz/{quizId}`
- **Get all quizzes (GET):** `/quiz`
- **Update quiz by quiz ID (PUT):** `/quiz/{quizId}`
- **Delete quiz by quiz ID (DELETE):** `/quiz/{quizId}`

### Question
- **Seed question data (POST):** `/seed-questions`
- **Create question (POST):** `/quiz/{quizId}/question`
- **Get questions by quiz ID (GET):** `/quiz/{quizId}/questions`
- **Update question by quiz ID and question ID (PUT):** `/quiz/{quizId}/question/{questionId}`
- **Delete question by quiz ID and question ID (DELETE):** `/quiz/{quizId}/question/{questionId}`

### User
- **Create user (POST):** `/user`
- **Get user by ID (GET):** `/user/{userId}`
- **Get user by username (GET):** `/users/username/{userName}`
- **Get all users (GET):** `/user`
- **Update user by user ID (PUT):** `/user/{userId}`
- **Delete user by user ID (DELETE):** `/user/{userId}`

### User Attempt
- **Create user attempt (POST):** `/attempts`
- **Get user attempt by user ID, quiz ID, and attempt ID (GET):** `/attempts/{userId}/{quizId}/{attemptId}`
- **List all attempts by user ID (GET):** `/attempts/{userId}`
- **Get user attempt details by attempt ID (GET):** `/attempts/details/{attemptId}`
- **Update user attempt (PUT):** `/attempts/{userId}/{quizId}/{attemptId}`

### Progress
- **Get current question in progress (GET):** `/quiz/progress/{userId}/{quizId}/{attemptId}`
- **Move to next question in progress (POST):** `/quiz/progress/next`

### Answer
- **Create user answer (POST):** `/answers`
- **Get all user answers by user ID, quiz ID, and attempt ID (GET):** `/answers/{userId}/{quizId}/{attemptId}`

### Miscellaneous
- **Backfill user and quiz IDs (POST):** `/run-backfill`

### Testing
In order to test the endpoints, we can either test with the production or with the local endpoints. The instructions below show testing using the local endpoints. There are 3 options for testing the endpoints:
- Use Postman
- Use `curl`
- Use the serverless framework's

For all options, the `serverless offline` plugin needs to be installed and started.
- To install, follow the instructions in the [official Serverless Framework documentation for offline][url-serverless-offline-documentation].
- To start the plugin, run: `sls offline`.

#### Postman
##### Viewing all quizzes
To view all quizzes, select `GET` and then specify the local endpoint for getting all quizzes, which is provided by the serverless offline plugin when it is started, for example: `http://localhost:3000/dev/quiz`. Then click on `Send`.

##### Creating a quiz
To create a quiz, select `POST` and specify the local endpoint for creating a quiz. For example: `http://localhost:3000/dev/quiz`.

The body of the request should contain the following attributes:
- `title`: title of the quiz
- `description`: the quiz's description

For example:

```json
{
   "title":"Python Basics",
   "description":"A quiz covering fundamental concepts in Python."
}
```

If the request was successful, the newly created quiz's ID will be returned in the API's response.

##### Creating a question for a quiz
To create a question for a quiz, first specify the quiz id in the endpoint's url. For example, for adding a question to the quiz with id `q123`, the url should be: `http://localhost:3000/dev/quiz/q123/question`.

Then, the request's body should include the following attributes:
- `correctAnswer`:
  - A list of strings for multiple correct answers
  - A string for a single answer
- `options`: A list of strings with possible choices
- `questionText`: A string with the question text

For example:

```json
{
   "correctAnswer":"def",
   "options":[
      "function",
      "fun",
      "def",
      "create"
   ],
   "questionText":"Which keyword is used for creating a function in Python??"
}
```

#### CURL
For getting all quizzes, run the following:
`curl -X GET http://localhost:3000/dev/quiz`

For creating a quiz, run the following:
`curl -X POST http://localhost:3000/dev/quiz -d '{"title":"Python Quiz", "description":"A quiz about Python"}'`

For creating a question, run the following:
`curl -X POST http://localhost:3000/dev/quiz/q123/question -d '{"correctAnswer":"def","options":["function","fun","def","create"],"questionText":"Which keyword is used for creating a function in Python?"}'`

#### Local function invocation
Another way to test the endpoints is by invoking the lambda function that makes the API call. This can be achieved in the serverless framework, either by specifying the JSON body in the command, or by specifying the location of a file that includes the JSON body, as seen below:

```bash
serverless invoke local \
--function createQuiz \
--path ../event_test.json
```
`function`: The function that is responsible for making that API call. The name is provided by the serverless framework, after running `sls offline`.
`path`: The path that the file containing the JSON request body is located in.


The `event_test.json` file includes the following:
```json
{
    "body": "{\"title\": \"C# Basics\", \"description\": \"A quiz covering fundamental concepts in C#.\"}"
}
```

[img-project-technologies]: https://i.ibb.co/fXnLRyr/img-project-technologies.png
[url-serverless-offline-documentation]: https://www.serverless.com/plugins/serverless-offline

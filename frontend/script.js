document.addEventListener('DOMContentLoaded', init);

let baseUrl, stage;

if (window.location.hostname === '127.0.0.1') {
    baseUrl = 'http://localhost:3000'; // Local base URL
    stage = 'local';
} else if (window.location.hostname.includes('dev')) {
    baseUrl = 'https://lx31hr5mn2.execute-api.eu-north-1.amazonaws.com'; // Development base URL
    stage = 'dev';
}

// Initialize the app based on the current page
async function init() {
    const pathname = window.location.pathname;

    if (pathname.includes('index.html')) {
        const loginButton = document.getElementById('login-button');
        loginButton.addEventListener('click', handleLogin);
    } else if (pathname.includes('homepage.html')) {
        await handleHomepage();
    } else if (pathname.includes('description.html')) {
        await handleQuizDescription();
    } else if (pathname.includes('question.html')) {
        await handleQuestionPage();
    } else if (pathname.includes('results.html')) {
        await handleResultsPage();
    } else if (pathname.includes('user-attempts.html')) {
        await handleUserAttemptsPage();
    } else if (pathname.includes('quizzes-list.html')) {
        await handquizzeslistPage();
    }
}

//
// --- INDEX PAGE LOGIC ---
//

async function handleLogin() {
    const usernameField = document.getElementById('username-field');
    const errorMessage = document.getElementById('error-message');
    const username = usernameField.value.trim();

    if (!username) {
        errorMessage.textContent = 'Please enter a username.';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const user = await validateUsername(username);
        sessionStorage.setItem('userId', user.userId); // Save userId in session storage
        sessionStorage.setItem('userRole', user.role); // Save role for future use

        if (user.role === 'student') {
            window.location.href = 'homepage.html';
        } else if (user.role === 'teacher') {
            window.location.href = 'teacher-dashboard.html'; // Define the teacher page later
        } else {
            errorMessage.textContent = 'Unknown role. Please contact support.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Invalid username. Please try again.';
        errorMessage.style.display = 'block';
        console.error(`Error validating username`, error);
    }
}

async function validateUsername(username) {
    try {
        const response = await fetch(`${baseUrl}/${stage}/users/username/${username}`);
        if (!response.ok) throw new Error('User not found');
        return await response.json(); // Assume the response contains user data including the role
    } catch (error) {
        console.error('Error validating username:', error);
        throw error;
    }
}

//
// --- HOMEPAGE LOGIC ---
//

async function handleHomepage() {
    try {
        const quizzes = await getQuizzes();
        displayQuizzes(quizzes['quizzes']);
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

async function getQuizzes() {
    try {
        const response = await fetch(`${baseUrl}/${stage}/quiz`);
        if (!response.ok) throw new Error('Failed to fetch quizzes');
        return await response.json();
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        throw error;
    }
}

function displayQuizzes(quizzes) {
    const quizzesContainer = document.getElementById('quizzes-container');
    quizzesContainer.innerHTML = ''; // Clear existing content

    quizzes.forEach((quiz) => {
        const quizOption = document.createElement('div');
        quizOption.className = 'quiz-option';

        const quizImage = document.createElement('img');
        quizImage.src = `./images/${quiz.title.toLowerCase()}.png`;
        quizImage.alt = quiz.title;

        const quizTitle = document.createElement('a');
        quizTitle.href = 'description.html';
        quizTitle.dataset.quizId = quiz.quizId;
        quizTitle.textContent = quiz.title;

        quizTitle.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default anchor behavior
            storeSelectedQuiz(quiz.quizId); // Store the selected quiz ID
            window.location.href = 'description.html'; // Navigate to description page
        });

        quizOption.appendChild(quizImage);
        quizOption.appendChild(quizTitle);
        quizzesContainer.appendChild(quizOption);
    });
}

function storeSelectedQuiz(selectedQuizId) {
    sessionStorage.setItem('selectedQuizId', selectedQuizId);
}

//
// --- QUIZ DESCRIPTION LOGIC ---
//

async function handleQuizDescription() {
    displayQuizDescription();

    const startQuizButton = document.getElementById('start-quiz');
    startQuizButton.addEventListener('click', async () => {
        const selectedQuizId = loadSelectedQuizId();
        try {
            const userAttempt = await startQuiz(selectedQuizId);
            storeUserAttempt(userAttempt.userAttemptId);
            window.location.href = 'question.html';
        } catch (error) {
            console.error('Error starting quiz:', error);
        }
    });
}

function loadSelectedQuizId() {
    return sessionStorage.getItem('selectedQuizId');
}

async function startQuiz(quizId) {
    const userId = sessionStorage.getItem('userId'); // Retrieve userId from session storage
    if (!userId) {
        throw new Error('User not logged in');
    }

    try {
        const response = await fetch(`${baseUrl}/${stage}/attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId, userId }),
        });
        if (!response.ok) throw new Error('Failed to start quiz');
        return await response.json();
    } catch (error) {
        console.error('Error starting quiz:', error);
        throw error;
    }
}

function storeUserAttempt(userAttemptId) {
    sessionStorage.setItem('userAttemptId', userAttemptId);
}

async function displayQuizDescription() {
    const selectedQuizId = loadSelectedQuizId();
    if (!selectedQuizId) {
        displayErrorMessage('No quiz selected.');
        return;
    }

    try {
        const quiz = await fetchQuizById(selectedQuizId);
        const descriptionBox = document.getElementById('description-box');
        descriptionBox.textContent = quiz.description || 'Description not available.';
    } catch (error) {
        console.error('Error fetching quiz:', error);
        displayErrorMessage('Quiz not found.');
    }
}

async function fetchQuizById(quizId) {
    try {
        const response = await fetch(`${baseUrl}/${stage}/quiz/${quizId}`);
        if (!response.ok) throw new Error('Quiz not found');
        return await response.json(); // Assuming the response includes the quiz object
    } catch (error) {
        console.error('Error fetching quiz by ID:', error);
        throw error;
    }
}

function displayErrorMessage(message) {
    const descriptionBox = document.getElementById('description-box');
    descriptionBox.textContent = message;
}

//
// --- QUESTION PAGE LOGIC ---
//

function setupNextButtonListener() {
    const nextButton = document.getElementById('btn-dynamic');
    nextButton.addEventListener('click', async () => {
        try {
            const userId = sessionStorage.getItem('userId');
            const selectedQuizId = sessionStorage.getItem('selectedQuizId');
            const userAttemptId = sessionStorage.getItem('userAttemptId');

            const response = await moveToNextQuestion(userId, selectedQuizId, userAttemptId);

            if (response.questionId) {
                loadAndDisplayQuestion(response); // Load the next question
            } else {
                window.location.href = 'results.html'; // No more questions
            }
        } catch (error) {
            console.error('Error moving to the next question:', error);
        }
    });
}

async function handleQuestionPage() {
    // Load the first question
    await loadAndDisplayQuestion();

    // Set up the dynamic button behavior
    const dynamicButton = document.getElementById('btn-dynamic');
    dynamicButton.addEventListener('click', async () => {
        const mode = dynamicButton.dataset.mode;

        if (mode === 'submit') {
            await handleSubmit();
        } else if (mode === 'next') {
            await handleNext();
        }
    });
}

async function handleSubmit() {
    const selectedOption = document.querySelector('.btn-option.selected');
    if (!selectedOption) {
        alert('Please select an answer');
        return;
    }

    const userAnswer = selectedOption.dataset.option;
    const userId = sessionStorage.getItem('userId');
    const selectedQuizId = sessionStorage.getItem('selectedQuizId');
    const userAttemptId = sessionStorage.getItem('userAttemptId');
    const questionId = sessionStorage.getItem('currentQuestionId'); // Assume this is stored when a question is displayed

    try {
        const evaluation = await submitAnswer(userId, selectedQuizId, userAttemptId, questionId, userAnswer);
        displayEvaluation(evaluation, userAttemptId);

        // Change button state to "Next"
        const dynamicButton = document.getElementById('btn-dynamic');
        dynamicButton.textContent = 'Next';
        dynamicButton.dataset.mode = 'next';
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

async function handleNext() {
    const userId = sessionStorage.getItem('userId');
    const selectedQuizId = sessionStorage.getItem('selectedQuizId');
    const userAttemptId = sessionStorage.getItem('userAttemptId');

    try {
        const response = await moveToNextQuestion(userId, selectedQuizId, userAttemptId);

        if (response.questionId) {
            loadAndDisplayQuestion(response);

            // Change button state back to "Submit"
            const dynamicButton = document.getElementById('btn-dynamic');
            dynamicButton.textContent = 'Submit';
            dynamicButton.dataset.mode = 'submit';
        } else {
            window.location.href = 'results.html'; // No more questions
        }
    } catch (error) {
        console.error('Error moving to next question:', error);
    }
}


async function loadAndDisplayQuestion(questionData = null) {
    if (!questionData) {
        // Fetch the current question if no data is passed (initial page load)
        try {
            const userId = sessionStorage.getItem('userId');
            const selectedQuizId = sessionStorage.getItem('selectedQuizId');
            const userAttemptId = sessionStorage.getItem('userAttemptId');

            questionData = await getCurrentQuestion(userId, selectedQuizId, userAttemptId);
        } catch (error) {
            console.error('Error loading current question:', error);
            return;
        }
    }

    // Display the question
    displayQuestion(questionData);
}


async function getCurrentQuestion(userId, selectedQuizId, userAttemptId) {
    try {
        const response = await fetch(`${baseUrl}/${stage}/quiz/progress/${userId}/${selectedQuizId}/${userAttemptId}`);
        if (!response.ok) throw new Error('Failed to fetch current question');
        return await response.json();
    } catch (error) {
        console.error('Error fetching current question:', error);
        throw error;
    }
}

function displayQuestion(questionData) {
    const questionText = document.getElementById('heading-question-text');
    questionText.textContent = questionData.questionText;

    const questionNumber = document.getElementById('heading-question-number');
    questionNumber.textContent = `Question ${questionData.currentNumber} of ${questionData.totalQuestions}`;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Clear existing options

    questionData.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'btn-option';
        button.textContent = option;
        button.dataset.option = option;

        button.addEventListener('click', (event) => {
            document.querySelectorAll('.btn-option').forEach((btn) => btn.classList.remove('selected'));
            event.target.classList.add('selected');
        });

        optionsContainer.appendChild(button);
    });

    // Store the current question ID
    sessionStorage.setItem('currentQuestionId', questionData.questionId);
}

function setupSubmitButton(userAttemptId, questionId) {
    const submitButton = document.getElementById('btn-dynamic');
    submitButton.addEventListener('click', async () => {
        const selectedOption = document.querySelector('.btn-option.selected');
        if (!selectedOption) {
            alert('Please select an answer');
            return;
        }

        const userAnswer = selectedOption.dataset.option;
        try {
            const userId = sessionStorage.getItem('userId');
            const selectedQuizId = sessionStorage.getItem('selectedQuizId');
            const evaluation = await submitAnswer(userId, selectedQuizId, userAttemptId, questionId, userAnswer);
            displayEvaluation(evaluation, userAttemptId);
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    });
}

async function submitAnswer(userId, quizId, attemptId, questionId, userAnswer) {
    try {
        const response = await fetch(`${baseUrl}/${stage}/answers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, quizId, attemptId, questionId, userAnswer }),
        });
        if (!response.ok) throw new Error('Failed to submit answer');
        return await response.json();
    } catch (error) {
        console.error('Error submitting answer:', error);
        throw error;
    }
}

function displayEvaluation(evaluation, userAttemptId) {
    const correctAnswers = evaluation.correctAnswers; // Backend should return this in the response
    document.querySelectorAll('.btn-option').forEach((button) => {
        if (correctAnswers.includes(button.textContent)) {
            button.classList.add('correct');
        } else if (button.classList.contains('selected')) {
            button.classList.add('incorrect');
        }
    });

    const nextButton = document.getElementById('btn-dynamic');
    nextButton.style.display = 'block';

    // "Next" button is already set up, no need to duplicate listeners
}


async function moveToNextQuestion(userId, quizId, attemptId) {
    try {
        const response = await fetch(`${baseUrl}/${stage}/quiz/progress/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, quizId, attemptId }),
        });
        if (!response.ok) throw new Error('Failed to move to next question');
        return await response.json();
    } catch (error) {
        console.error('Error moving to next question:', error);
        throw error;
    }
}

//
// --- QUIZ RESULT PAGE LOGIC ---
//

async function handleResultsPage() {
    const userId = sessionStorage.getItem('userId');
    const selectedQuizId = sessionStorage.getItem('selectedQuizId');
    const userAttemptId = sessionStorage.getItem('userAttemptId');

    try {
        const response = await fetch(`${baseUrl}/${stage}/attempts/${userId}/${selectedQuizId}/${userAttemptId}`);
        if (!response.ok) throw new Error('Failed to fetch user attempt details');

        const { score, timeTaken } = await response.json();

        displayResults(score, timeTaken);
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

function displayResults(score, timeTaken) {
    const scoreElement = document.getElementById('score');
    const timeElement = document.getElementById('time-taken');

    scoreElement.textContent = `Score: ${score}`;
    if (timeTaken) {
        timeElement.textContent = `Time Taken: ${timeTaken.minutes} minutes and ${timeTaken.seconds} seconds`;
    } else {
        timeElement.textContent = 'Time Taken: Not available';
    }
}

//
// --- USER ATTEMPTS PAGE LOGIC ---
//

async function handleUserAttemptsPage() {
    updateHomeLink();

    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole'); // Assume role is stored in session

    try {
        if (userRole === 'teacher') {
            await setupStudentDropdown();
        } else if (userRole === 'student') {
            const attempts = await fetchAttempts(userId);
            displayAttempts(attempts);
        }
    } catch (error) {
        console.error('Error loading user attempts:', error);
    }
}

async function setupStudentDropdown() {
    const dropdown = document.getElementById('student-dropdown');
    dropdown.style.display = 'block'; // Ensure the dropdown is visible for teachers

    try {
        const response = await fetch(`${baseUrl}/${stage}/user/students`);
        if (!response.ok) throw new Error('Failed to fetch student list');

        const { students } = await response.json();

        // Populate dropdown with student names
        dropdown.innerHTML = `
            <option value="" disabled selected>Select a student</option>
            ${students.map((student) => `<option value="${student.userId}">${student.userName}</option>`).join('')}
        `;

        // Add event listener to fetch attempts for selected student
        dropdown.addEventListener('change', async (event) => {
            const userId = event.target.value; // Selected student's userId
            const attempts = await fetchAttempts(userId);
            displayAttempts(attempts);
        });
    } catch (error) {
        console.error('Error fetching student list:', error);
    }
}

async function displayAttempts(attempts) {
    const container = document.getElementById('attempts-container');
    container.innerHTML = '';

    const promises = attempts.map(async (attempt) => {
        const quiz = await fetchQuizById(attempt.quizId);

        const attemptDiv = document.createElement('div');
        attemptDiv.classList.add('attempt-entry');

        attemptDiv.innerHTML = `
            <h3>${quiz.title}</h3>
            <p>Date Started: ${formatDateTime(attempt.dateStarted)}</p>
            <p>Score: ${attempt.score}</p>
            <p>Time Taken: ${attempt.timeTaken.minutes} minutes ${attempt.timeTaken.seconds} seconds</p>
            <button class="view-answers" data-attempt-id="${attempt.attemptId}">View Answers</button>
        `;

        container.appendChild(attemptDiv);
    });
    await Promise.all(promises);
    setupAnswerButtons();
}

async function fetchAttempts(userId) {
    try {
        const response = await fetch(`${baseUrl}/${stage}/attempts/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch attempts');
        const { attempts } = await response.json();
        return attempts;
    } catch (error) {
        console.error('Error fetching attempts:', error);
        return [];
    }
}

function setupAnswerButtons() {
    const buttons = document.querySelectorAll('.view-answers');
    buttons.forEach((button) => {
        button.addEventListener('click', async (event) => {
            const attemptId = event.target.dataset.attemptId;
            await showAnswersModal(attemptId);
        });
    });
}

async function showAnswersModal(attemptId) {
    try {
        // Fetch user attempt details to get the associated quizId
        const userAttemptResponse = await fetch(`${baseUrl}/${stage}/attempts/details/${attemptId}`);
        if (!userAttemptResponse.ok) throw new Error('Failed to fetch user attempt details');
        const userAttempt = await userAttemptResponse.json();

        const quizId = userAttempt.quizId;
        const userId = userAttempt.userId;

        // Fetch answers for the attempt
        const response = await fetch(`${baseUrl}/${stage}/answers/${userId}/${quizId}/${attemptId}`);
        if (!response.ok) throw new Error('Failed to fetch answers');

        const { answers } = await response.json();

        // Display the answers in the modal
        displayAnswers(answers);
    } catch (error) {
        console.error('Error loading answers:', error);
    }
}


function displayAnswers(answers) {
    const container = document.getElementById('answers-container');
    container.innerHTML = ''; // Clear existing answers

    answers.forEach((answer) => {
        const answerDiv = document.createElement('div');
        answerDiv.classList.add('answer-entry', answer.status === 'pass' ? 'correct' : 'incorrect');
        answerDiv.innerHTML = `
            <p>Question: ${answer.questionText}</p>
            <p>Your Answer: ${answer.userAnswer}</p>
            <p>Correct Answer: ${answer.correctAnswer}</p>
        `;
        container.appendChild(answerDiv);
    });

    const modal = document.getElementById('answers-modal');
    modal.style.display = 'block';

    const closeButton = document.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

//
// --- QUIZZES LIST LOGIC ---
//

async function handquizzeslistPage() {
    const userId = sessionStorage.getItem('userId');
    const role = sessionStorage.getItem('userRole'); // Ensure the role is fetched correctly
    const errorMessage = document.getElementById('div-error-message'); // Define errorMessage dynamically

    try {
        if (role === 'teacher') {
            const quizzes = await getQuizzes();
            displayEditQuizzes(quizzes['quizzes']);
        } else {
            errorMessage.textContent = 'You must have a teacher role. Please contact support.';
            errorMessage.style.color = 'red';
            document.body.prepend(errorMessage); // Add error message to the body
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

function displayEditQuizzes(quizzes) {
    const quizzesContainer = document.getElementById('quizzes-container-list');
    quizzesContainer.innerHTML = ''; // Clear existing content

    const createQuizButton = document.getElementById('create-quiz-button');
    if (createQuizButton) {
        createQuizButton.addEventListener('click', () => {
            window.location.href = 'create-quiz.html';
        });
    }

    if (!quizzes || quizzes.length === 0) {
        const noQuizzesMessage = document.createElement('p');
        noQuizzesMessage.textContent = 'No quizzes available.';
        quizzesContainer.appendChild(noQuizzesMessage);
        return;
    }

    quizzes.forEach((quiz) => {
        const quizEntry = document.createElement('div');
        quizEntry.className = 'quiz-entry';

        const quizTitle = document.createElement('h3');
        quizTitle.textContent = quiz.title;

        const quizDescription = document.createElement('p');
        quizDescription.textContent = quiz.description;

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit Quiz';
        editButton.addEventListener('click', () => {
            storeSelectedQuiz(quiz.quizId);
            window.location.href = 'edit-quiz.html';
        });

        quizEntry.appendChild(quizTitle);
        quizEntry.appendChild(quizDescription);
        quizEntry.appendChild(editButton);

        quizzesContainer.appendChild(quizEntry);
    });
}

//
// --- HELPER FUNCTIONS ---
//

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const formattedDate = date.toISOString().split('T')[0]; // Extracts 'YYYY-MM-DD'
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${formattedDate} ${formattedTime}`;
}

function updateHomeLink() {
    const userRole = sessionStorage.getItem('userRole');
    const homeLink = document.getElementById('link-home');

    if (userRole === 'teacher') {
        homeLink.href = 'teacher-dashboard.html';
    } else if (userRole === 'student') {
        homeLink.href = 'homepage.html';
    } else {
        homeLink.href = 'index.html';
    }
}

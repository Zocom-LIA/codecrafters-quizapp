// Add a listener to the init function, so it runs when the DOM is fully loaded
// This ensures that the API call and displaying of quizzes happens as soon as possible
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Get the current URL or pathname
    const pathname = window.location.pathname;

    if (pathname.includes('homepage.html')) {
        try {
            let quizzes;
            quizzes = await getQuizzes();
            storeQuizzes(quizzes);
            displayQuizzes(quizzes['quizzes']);
        } catch (error) {
            console.error('Error initializing the app:', error);
        }
    } else if (pathname.includes('description.html')) {
        displayQuizDescription();
        addStartQuizListener();
    } else if (pathname.includes('question.html')) {
        displayQuestion();
        evaluateAnswers();
    }
}

async function getQuizzes() {
    try {
        const response = await fetch('http://localhost:3000/dev/quiz');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("Quizzes retrieved");
        return data;
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        throw error;
    }
}

// Function to get questions for a given quiz ID from the API
async function getQuestions(quizId) {
    try {
        const response = await fetch(`http://localhost:3000/dev/quiz/${quizId}/questions`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("Questions retrieved");
        return data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
}

// Store quizzes to session storage
function storeQuizzes(quizzes) {
    sessionStorage.setItem('quizzes', JSON.stringify(quizzes['quizzes']));
    console.log("Quizzes stored.");
}

// Retrieve the data from sessionStorage and parse it if it exists
function loadQuizzes() {
    const storedQuizzes = sessionStorage.getItem('quizzes');

    if (storedQuizzes) {
        try {
            return JSON.parse(storedQuizzes);
        } catch (error) {
            console.error("Error parsing JSON from sessionStorage", error);
            return null;
        }
    } else {
        console.warn("No quiz data found in sessionStorage");
        return null;
    }
}

function storeSelectedQuiz(selectedQuizId) {
    sessionStorage.setItem('selectedQuizId', selectedQuizId);
}

function loadSelectedQuizId() {
    return sessionStorage.getItem('selectedQuizId');
}

function loadQuestions() {
    const storedQuestions = sessionStorage.getItem('questions');

    if (storedQuestions) {
        try {
            return JSON.parse(storedQuestions);
        } catch (error) {
            console.error("Error parsing JSON from sessionStorage", error);
            return null;
        }
    } else {
        console.warn("No question data found in sessionStorage");
        return null;
    }
}

function loadSelectedQuizDescription() {
    const selectedQuizId = loadSelectedQuizId();
    const quizzes = loadQuizzes();

    if (!selectedQuizId || !quizzes) {
        console.log('Data not yet available.');
        return "Data not yet available.";
    }

    // Consider using built-in find() function
    for (let i = 0; i < quizzes.length; i++) {
        if (quizzes[i]['quizId'] === selectedQuizId)
            return quizzes[i]['description'];
    }
    console.log('Quiz not found.');
    return "Quiz not found.";
}

// Function to display the quizzes in the quiz-options element
function displayQuizzes(quizzes) {
    // consider loading directly
    // const quizzes = loadQuizzes()
    // This is for testing purposes, we should instead use a map
    // e.g. quizImagesMap={ 'python' : 'images /python. Png' }
    const imagePaths = ["images/c++.png", "images/python.png", "images/java.png"];
    const imageAltTexts = ["C++", "Python", "Java"];

    // Get the parent container element (quiz-options)
    const quizzesContainer = document.getElementById('quizzes-container');
    const quizDescriptionDestination = 'description.html';

    // Create and append 3 new div elements in a loop
    // This is a temporary limit until we implement pagination/arrows or another approach
    // We should then change the for loop to a foreach, to improve code readability
    for (let i = 0; i < quizzes.length; i++) {
        if (i < 3) {
            // Element for the quiz option (tile that includes image and title)
            const quizOption = document.createElement('div');

            let quizImage = document.createElement('img');

            // For testing purposes (for loopoing between the already available images)
            quizImage.src = imagePaths[i % 3];
            quizImage.alt = imageAltTexts[i % 3];

            var quizTitle = document.createElement('a');
            quizTitle.setAttribute('href', quizDescriptionDestination);
            quizTitle.dataset.quizId = quizzes[i]['quizId'];
            quizTitle.innerText = quizzes[i]['title'];

            quizTitle.addEventListener('click', (event) => {
                const selectedQuizId = event.target.dataset.quizId;
                storeSelectedQuiz(selectedQuizId);
                console.log("selected quiz: " + selectedQuizId);
            });

            // Add image and anchor elements to their parent element - quiz-options
            quizOption.appendChild(quizImage);
            quizOption.appendChild(quizTitle);

            quizOption.setAttribute('class', 'quiz-option');

            // Append the quiz-option div to the container (quiz-options)
            quizzesContainer.appendChild(quizOption);
        }
    }
}

function displayQuizDescription() {
    const quizDescription = loadSelectedQuizDescription();
    document.getElementById('description-box').textContent = quizDescription;
    console.log("Quiz description: " + quizDescription);
}

function storeQuestions(questions) {
    sessionStorage.setItem('questions', JSON.stringify(questions['questions']));
}

function addStartQuizListener() {
    const selectedQuizId = loadSelectedQuizId();
    // Select the button element
    const startQuizButton = document.getElementById('start-quiz');
    // Add an event listener to the button
    startQuizButton.addEventListener('click', async () => {
        try {
            // Call the async function to fetch questions
            const questions = await getQuestions(selectedQuizId);

            // Store the fetched questions in sessionStorage
            storeQuestions(questions);
            console.log('Questions stored in sessionStorage.');

            // Navigate to the new page after storing the data
            window.location.href = 'question.html';  // Change to the target page
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        }
    });
}

function displayQuestion() {
    var questions = loadQuestions();

    if (questions != 0) {
        var currentQuestion = 1
        var numOfQuestions = questions.length;
        const questionNumberHeading = document.getElementById('heading-question-number');
        questionNumberHeading.innerText = `${currentQuestion}/${numOfQuestions}`;

        const questionText = document.getElementById('heading-question-text');
        questionText.innerText = questions[0].questionText;

        for (let i = 0; i < 4; i++) {
            const buttonId = `btn-option-${i + 1}`;
            const buttonOption = document.getElementById(buttonId);
            buttonOption.textContent = questions[0].options[i];

            buttonOption.dataset.selected = 'false';

            buttonOption.addEventListener('click', selectOption);
        }
    }
}

// Function that runs when an option is selected
function selectOption(event) {
    // Toggle the value of the 'data-selected' attribute
    const isSelected = event.target.dataset.selected === 'true'; // Check current value
    event.target.dataset.selected = isSelected ? 'false' : 'true'; // Flip the value

    // TODO: Refactor using a css class (e.g. selected) to increase code readability
    // e.g. buttonOption.classList.toggle('selected'); // Add/remove the 'selected' class
    if (event.target.dataset.selected === 'true') {
        event.target.style.backgroundColor = '#f0f0f0';
        event.target.style.borderColor = 'black';
    } else {
        event.target.style.backgroundColor = 'white';
        event.target.style.borderColor = '#a262e3';
    }
    console.log(`Button {${event.target.id}} selected: ${event.target.dataset.selected}`); // Log the new value
}

function evaluateAnswers() {
    var questions = loadQuestions();
    const submitButton = document.getElementById('btn-submit');

    submitButton.addEventListener('click', (event) => {
        for (let i = 0; i < 4; i++) {
            const optionButton = document.getElementById(`btn-option-${i + 1}`);
            optionButton.removeEventListener('click', selectOption);

            console.log(optionButton.id + optionButton.dataset.selected);

            if (questions[0].correctAnswer.includes(optionButton.textContent)) {
                if (optionButton.dataset.selected === 'true') {
                    optionButton.style.backgroundColor = '#91DEC2';
                    optionButton.style.borderColor = '#91DEC2';
                    optionButton.style.fontWeight = 'bold';
                    console.log(optionButton.id + "Correct!");
                } else {
                    optionButton.style.backgroundColor = '#f0f0f0';
                    optionButton.style.borderWidth = '4px'; // Set border width
                    optionButton.style.borderStyle = 'dashed'; // Set border style (solid, dashed, etc.)
                    optionButton.style.fontWeight = 'bold';
                }
            } else {
                if (optionButton.dataset.selected === 'true') {
                    optionButton.style.backgroundColor = '#F0C3C3';
                    optionButton.style.borderColor = '#F0C3C3';
                }
            }
        }
    });
}
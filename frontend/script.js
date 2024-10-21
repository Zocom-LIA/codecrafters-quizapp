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
        return data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
}

// Store quizzes to session storage
function storeQuizzes(quizzes) {
    sessionStorage.setItem('quizzes', JSON.stringify(quizzes['quizzes']));
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
        return "Data not yet available.";
    }

    // Consider using built-in find() function
    for (let i = 0; i < quizzes.length; i++) {
        if (quizzes[i]['quizId'] === selectedQuizId)
            return quizzes[i]['description'];
    }
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

            // Set the current question number
            // This will be used by the functions for question.html page to figure out which question to show
            sessionStorage.setItem('nextQuestion', 0);

            // Navigate to the new page after storing the data
            window.location.href = 'question.html';
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        }
    });
}

// function runQuiz() {
//     var questions = loadQuestions();

//     for (const question of questions) {
//         displayQuestion(question);
//         evaluateAnswers(question);
//     }
// }

function displayQuestion() {
    var questions = loadQuestions();

    if (questions != 0) {
        // Attributes are always stored in session storage as strings so it's necessary to parse them as numbers before processing them
        // Otherwise they'll be treated as strings and the results will be concatenated e.g. 1 + 1 will result in 11.
        var currentQuestion = Number(sessionStorage.getItem('nextQuestion'));
        sessionStorage.setItem('currentQuestion', currentQuestion);
        var numOfQuestions = questions.length;

        // If it's the last question, we should ensure that we end the question-alswer page loop
        if (currentQuestion == numOfQuestions - 1) {
            sessionStorage.setItem('nextQuestion', -1);
        } else {
            sessionStorage.setItem('nextQuestion', currentQuestion + 1);
        }

        const questionNumberHeading = document.getElementById('heading-question-number');
        questionNumberHeading.innerText = `${currentQuestion + 1}/${numOfQuestions}`;

        const questionText = document.getElementById('heading-question-text');
        questionText.innerText = questions[currentQuestion].questionText;

        for (let i = 0; i < 4; i++) {
            const buttonId = `btn-option-${i + 1}`;
            const buttonOption = document.getElementById(buttonId);
            buttonOption.textContent = questions[currentQuestion].options[i];

            buttonOption.dataset.selected = 'false';

            // Restore buttons to their initial style. This is important because the same elements are used for all questions of the quiz
            buttonOption.style.backgroundColor = 'white';
            buttonOption.style.borderColor = '#a262e3';
            buttonOption.style.fontWeight = 'normal';
            buttonOption.style.borderWidth = '2px';
            buttonOption.style.borderStyle = 'solid';

            // Removing the button listener that was attached in the previous question. This is important as we're running this function multiple times
            // and we don't want to end up with multiple listeners, all triggering separately.
            if (currentQuestion != 0) {
                buttonOption.removeEventListener('click', selectOptionListener);
            }
            buttonOption.addEventListener('click', selectOptionListener);
        }
    }
}

// Function that runs when an option is selected
function selectOptionListener(event) {
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
}

function evaluateAnswers() {
    const submitButton = document.getElementById('btn-submit');
    // mode is an HTML data-* attribute that defines the 'Submit' button's behaviour. It has the following states:
    //  - submit: In this state, the user's answers are submitted and evaluated against the correct answer(s) for the current question. The button's label is 'Submit'.
    //  - next: In this state, the button is used for navigating to the next question of the quiz. The button label is 'Next' and clicking the button will show the next question of the quiz. The button is in this state when there is 
    //  - results: In this state, the current question is the last question. The button label is 'Results' and clicking the button will navigate to the results page, ending the question-result loop.
    submitButton.dataset.mode = 'submit';

    submitButton.addEventListener('click', (event) => {
        var questions = loadQuestions();
        var currentQuestion = Number(sessionStorage.getItem('currentQuestion'));

        if (event.target.dataset.mode === 'submit') {
            for (let i = 0; i < 4; i++) {
                const optionButton = document.getElementById(`btn-option-${i + 1}`);

                if (questions[currentQuestion].correctAnswer.includes(optionButton.textContent)) {
                    if (optionButton.dataset.selected === 'true') {
                        optionButton.style.backgroundColor = '#91DEC2';
                        optionButton.style.borderColor = '#91DEC2';
                        optionButton.style.fontWeight = 'bold';
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
            if (Number(sessionStorage.getItem('nextQuestion')) != -1) {
                event.target.textContent = 'Next';
                event.target.dataset.mode = 'next';
            } else {
                event.target.textContent = 'View Results';
                event.target.dataset.mode = 'results';
            }
        } else if (event.target.dataset.mode === 'next') {
            event.target.textContent = 'Submit';
            event.target.dataset.mode = 'submit';
            displayQuestion();
        } else if (event.target.dataset.mode === 'results') {
            window.location.href = 'results.html';
        }
    });
}
// Add a listener to the init function, so it runs when the DOM is fully loaded
// This ensures that the API call and displaying of quizzes happens as soon as possible
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Get the current URL or pathname
    const pathname = window.location.pathname;

    // In the homepage, the quizzes are retrieved by making an API call, they're stored in session and the quizz links (tiles) are displayed dynamically.
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
        addStartQuizListener();     // This makes another API call to retireve all questions for the selected quiz
    } else if (pathname.includes('question.html')) {
        displayQuestion();
        evaluateAnswers();
    }
}

// API call to getAllQuizzes
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

// API call to getQuestionsByQuiz
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

// Retrieve the quizzes from sessionStorage and parse it if it exists
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

// Store the user selected quiz for retrieving it in the description and question pages
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

    // Check for cases where the API hasn't yet returned the data
    if (!selectedQuizId || !quizzes) {
        return "Data not yet available.";
    }

    const quiz = quizzes.find(quiz => quiz.quizId === selectedQuizId);
    return quiz ? quiz.description : "Quiz not found.";
}

// Function to display the quizzes in the quiz-options element
function displayQuizzes(quizzes) {
    // This is for testing purposes, we should instead use a map
    // e.g. quizImagesMap={ 'python' : 'images /python. Png' }
    const imagePaths = ["images/c++.png", "images/python.png", "images/java.png"];
    const imageAltTexts = ["C++", "Python", "Java"];

    // Get the parent container element (quiz-options), which will include all the dynamically created quiz links
    const quizzesContainer = document.getElementById('quizzes-container');
    const quizDescriptionDestination = 'description.html';

    // Create and append 3 new div elements in a loop
    // This is a temporary limit until we implement pagination/arrows or another approach
    // We should then change the for loop to a for...of, to improve code readability
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

// Logic for moving from the description to the question page. An API call is made to retrieve questions for the quiz id selected by the user, and then the questions are stored in session, before navigating to the question page.
function addStartQuizListener() {
    const selectedQuizId = loadSelectedQuizId();
    const startQuizButton = document.getElementById('start-quiz');
    startQuizButton.addEventListener('click', async () => {
        try {
            // Call the async function to fetch questions
            const questions = await getQuestions(selectedQuizId);

            // Store the fetched questions in sessionStorage
            storeQuestions(questions);

            // Set the current question number. This will be used by the functions for question.html page to determine which question to show
            sessionStorage.setItem('nextQuestion', 0);

            sessionStorage.setItem('score', 0);

            // Navigate to the new page after storing the data
            window.location.href = 'question.html';
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        }
    });
}

// The 1st part of the question page includes adding question text, number, as well as linking the possible options to the page's buttons.
function displayQuestion() {
    var questions = loadQuestions();

    if (questions != 0) {
        // Attributes are always stored in session storage as strings so it's necessary to parse them as numbers before processing them
        // Otherwise they'll be treated as strings and the results will be concatenated e.g. 1 + 1 will result in 11.
        var currentQuestion = Number(sessionStorage.getItem('nextQuestion'));
        sessionStorage.setItem('currentQuestion', currentQuestion);
        var numOfQuestions = questions.length;

        // If it's the last question, we should ensure that we end the question-answer page loop
        if (currentQuestion == numOfQuestions - 1) {
            sessionStorage.setItem('nextQuestion', -1);
        } else {
            sessionStorage.setItem('nextQuestion', currentQuestion + 1);
        }

        // Add the question numbering on top of the page (e.g. 1/4)
        const questionNumberHeading = document.getElementById('heading-question-number');
        questionNumberHeading.innerText = `${currentQuestion + 1}/${numOfQuestions}`;

        // Add the question text to the page
        const questionText = document.getElementById('heading-question-text');
        questionText.innerText = questions[currentQuestion].questionText;

        // For every button-choice, the style is reset and a click listener is attached
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

// Function that runs when an option is selected. The user choice is saved and the button changes style to reflect the change.
function selectOptionListener(event) {
    // Toggle the value of the 'data-selected' attribute. This acts as a flag to determine if the specific button is clicked (the user selected this as a possible answer).
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

// The 2nd part of the question page includes evaluating user choices against the correct answers and changing button styles to reflect the result.
function evaluateAnswers() {
    const submitButton = document.getElementById('btn-submit');
    // mode is an HTML data-* attribute created to define the 'Submit' button's behaviour. It has the following states:
    //  - question: This is the state when a new question is presented to the user. When the button is pressed in this state, the next state is 'answer', where the user's answers are submitted and evaluated against the correct answer(s) for the current question. The button's label in this mode is 'Submit'.
    //  - answer: This is the state where the correct answers are shown. The button is used for navigating to the next question of the quiz. The button label is 'Next' and clicking the button will show the next question of the quiz.
    //  - results: In this state, the current question is the last question. Clicking the button will navigate to the results page, ending the question-result loop. The button label is 'Results'.
    submitButton.dataset.mode = 'question';

    submitButton.addEventListener('click', (event) => {
        var questions = loadQuestions();
        var currentQuestion = Number(sessionStorage.getItem('currentQuestion'));

        if (event.target.dataset.mode === 'question') {
            for (let i = 0; i < 4; i++) {
                const optionButton = document.getElementById(`btn-option-${i + 1}`);
                // Make option buttons non clickable when the results are showing, as the answer can't be changed.
                // Another choice (to removing the listener) would be to disable the button, but this would also change its style, according to the browser specifications, and changing it would require more code and wouldn't be a good practice.
                optionButton.removeEventListener('click', selectOptionListener);

                if (questions[currentQuestion].correctAnswer.includes(optionButton.textContent)) {
                    if (optionButton.dataset.selected === 'true') {
                        optionButton.style.backgroundColor = '#91DEC2';
                        optionButton.style.borderColor = '#91DEC2';
                        optionButton.style.fontWeight = 'bold';
                        sessionStorage.setItem('score', Number(sessionStorage.getItem('score')) + 100); // Increase user score for finding the correct answer.
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
                event.target.dataset.mode = 'answer';
            } else {
                event.target.textContent = 'View Results';
                event.target.dataset.mode = 'results';
            }
        } else if (event.target.dataset.mode === 'answer') {
            event.target.textContent = 'Submit';
            event.target.dataset.mode = 'question';
            displayQuestion();
        } else if (event.target.dataset.mode === 'results') {
            window.location.href = 'results.html';
        }
    });
}
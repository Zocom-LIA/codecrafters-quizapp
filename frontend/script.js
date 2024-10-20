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
        //         addStartQuizListener();
    }
}

async function getQuizzes() {
    try {
        const response = await fetch('http://localhost:3000/dev/quiz');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("Quizzes retrieved")
        return data;
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        throw error;
    }
}

// Store quizzes to session storage
function storeQuizzes(quizzes) {
    sessionStorage.setItem('quizzes', JSON.stringify(quizzes['quizzes']))
    console.log("Quizzes stored.")
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

function loadSelectedQuizDescription() {
    const selectedQuizId = loadSelectedQuizId();
    const quizzes = loadQuizzes();

    // TODO: Fix bug of unavailable data.
    if (!selectedQuizId || !quizzes) {
        console.log('Data not available yet.');
        return "Quiz Description";
    }

    for (let i = 0; i < quizzes.length; i++) {
        if (quizzes[i]['quizId'] === selectedQuizId)
            return quizzes[i]['description'];
    }
    return "Not found";
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
    const quizzesContainer = document.getElementById('quizzes-container')
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
            quizTitle.dataset.quizId = quizzes[i]['quizId']
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
}
// Add a listener to the init function, so it runs when the DOM is fully loaded
// This ensures that the API call and displaying of quizzes happens as soon as possible
document.addEventListener('DOMContentLoaded', init);

function init() {
    getQuizzes()
        .then(data => storeQuizzes(data))   // Store the quizzes response
        .then(displayQuizzes()) // Create quiz tiles
        // .then(storeLinkIdOnClick())   // Add a listener to links in order to extract their ID when clicked
        .catch(error => {
            console.error('Error fetching quizzes:', error);
        });
}

// Function to get quizzes from the API
function getQuizzes() {
    return fetch('http://localhost:3000/dev/quiz')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Parse JSON data
        });
}

// Store quizzes to session storage
function storeQuizzes(quizzes) {
    sessionStorage.setItem('quizzes', JSON.stringify(quizzes))
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

// Function to display the quizzes in the quiz-options element
function displayQuizzes() {
    quizzes = loadQuizzes()
    // This is for testing purposes, we should instead use a map
    // e.g. quizImagesMap={ 'python' : 'images /python. Png' }
    const imagePaths = ["images/c++.png", "images/python.png", "images/java.png"];
    const imageAltTexts = ["C++", "Python", "Java"];

    // Get the parent container element (quiz-options)
    const quizzesContainer = document.getElementById('quizzes-container')
    const quizDescriptionDestination = 'quiz_description.html';

    // Create and append 3 new div elements in a loop
    // This is a temporary limit until we implement pagination/arrows or another approach
    // We should then change the for loop to a foreach, to improve code readability
    for (let i = 0; i < quizzes['quizzes'].length; i++) {
        if (i < 3) {
            // Element for the quiz option (tile that includes image and title)
            const quizOption = document.createElement('div');

            let quizImage = document.createElement('img');

            // For testing purposes (for loopoing between the already available images)
            quizImage.src = imagePaths[i % 3];
            quizImage.alt = imageAltTexts[i % 3];

            var quizTitle = document.createElement('a');
            quizTitle.setAttribute('href', quizDescriptionDestination);
            quizTitle.id = quizzes['quizzes'][i]['quizId']
            quizTitle.innerText = quizzes['quizzes'][i]['title'];

            // Add image and anchor elements to their parent element - quiz-options
            quizOption.appendChild(quizImage);
            quizOption.appendChild(quizTitle);

            quizOption.setAttribute('class', 'quiz-option');

            // Append the quiz-option div to the container (quiz-options)
            quizzesContainer.appendChild(quizOption);
        }
    }
    const links = document.querySelectorAll('a');

    // Add click event listener to each anchor tag
    links.forEach(link => {
        link.addEventListener('click', function (event) {
            // Get the ID of the clicked link
            const linkId = this.id;

            // Store the quiz id in session storage
            sessionStorage.setItem('selectedQuizId', linkId);
        });
    });



}

// Function to add click event listeners to anchor tags
function storeLinkIdOnClick() {
    const links = document.querySelectorAll('a');

    // Add click event listener to each anchor tag
    links.forEach(link => {
        link.addEventListener('click', function (event) {
            // Get the ID of the clicked link
            const linkId = this.id;

            // Store the quiz id in session storage
            sessionStorage.setItem('selectedQuizId', linkId);
        });
    });
}
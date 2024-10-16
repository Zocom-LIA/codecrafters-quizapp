// Add a listener to the init function, so it runs when the DOM is fully loaded
// This ensures that the API call and displaying of quizzes happens as soon as possible
document.addEventListener('DOMContentLoaded', init);

function init() {
    getQuizzes()
        .then(data => displayQuizzes(data))  // Pass the fetched data to the display function
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

// Function to display the quizzes in the quiz-options element
function displayQuizzes(quizzes) {
    // This is for testing purposes, we should instead use a map
    // e.g. quizImagesMap={ 'python' : 'images /python. Png' }
    const imagePaths = ["images/c++.png", "images/python.png", "images/java.png"];
    const imageAltTexts = ["C++", "Python", "Java"];

    // Get the parent container element (quiz-options)
    const quizzesContainer = document.getElementById('quizzes-container')
    const quizDescriptionParameter = 'quiz_description.html?quizId=';

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
            quizTitle.setAttribute('href', quizDescriptionParameter + quizzes['quizzes'][i]['quizId']);
            quizTitle.innerText = quizzes['quizzes'][i]['title'];

            // Add image and anchor elements to their parent element - quiz-options
            quizOption.appendChild(quizImage);
            quizOption.appendChild(quizTitle);

            quizOption.setAttribute('class', 'quiz-option');

            // Append the quiz-option div to the container (quiz-options)
            quizzesContainer.appendChild(quizOption);
        }
    }
}
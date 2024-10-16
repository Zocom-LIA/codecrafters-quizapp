// Call the API to get all quizzes
async function fetchQuizzes() {
    const apiUrl = 'http://localhost:3000/dev/quiz';

    try {
        const response = await fetch(apiUrl);

        // Check if the response was successful
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json(); // Parse JSON response
        return data; // Return the data to be used elsewhere
    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Propagate error if needed
    }
}

// For testing purposes
const imagePaths = ["images/c++.png", "images/python.png", "images/java.png"];
const imageAltTexts = ["C++", "Python", "Java"];

// Add event listener to the button to call the fetchQuizzes function
document.getElementById('apiButton').addEventListener('click', async () => {
    try {
        const quizData = await fetchQuizzes();
        // const quizData = JSON.parse(apiData);
        console.log(quizData);
        // document.getElementById('jsonTest').innerText = quizData['quizzes'][1]['title'];

        // Get the parent container element
        const quizzesContainer = document.getElementById('quizzes-container')

        const quizDescriptionParameter = 'quiz_description.html?quizId=';

        // Create and append 3 new div elements in a loop
        for (let i = 0; i < quizData['quizzes'].length; i++) {
            // Temporary limit until we implement pagination/arrows
            if (i < 3) {
                // Element for the quiz option (tile that inlcudes image and title)
                const quizOption = document.createElement('div');

                let quizImage = document.createElement('img');

                // For testing purposes
                quizImage.src = imagePaths[i % 3];
                quizImage.alt = imageAltTexts[i % 3];

                var quizTitle = document.createElement('a');
                quizTitle.setAttribute('href', quizDescriptionParameter + quizData['quizzes'][i]['quizId']);

                quizTitle.innerText = quizData['quizzes'][i]['title'];

                // const quizTitle = document.createElement('p');
                // quizTitle.innerText = quizData['quizzes'][i]['title'];

                quizOption.appendChild(quizImage);
                quizOption.appendChild(quizTitle);

                quizOption.setAttribute('class', 'quiz-option');
                // quizOption.style.padding = '10px';
                // quizOption.style.border = '1px solid black';
                // quizOption.style.marginBottom = '5px';

                // Append the new div to the container
                quizzesContainer.appendChild(quizOption);
            }
        }
    } catch (error) {
        console.error('Error handling API data:', error);
    }
});





// // Add event listener to the button to call the fetchQuizzes function
// document.getElementById('apiButton').addEventListener('click', async () => {
//     try {
//         const quizData = await fetchQuizzes();
//         // const quizData = JSON.parse(apiData);
//         console.log(quizData);
//         // document.getElementById('jsonTest').innerText = quizData['quizzes'][1]['title'];

//         // Get the parent container element
//         const container = document.getElementById('quiz-options-container')

//         // Create and append 5 new div elements in a loop
//         for (let i = 0; i < quizData['quizzes'].length; i++) {
//             // Create a new div element
//             const newDiv = document.createElement('div');

//             // Set the content of the new div
//             newDiv.innerText = quizData['quizzes'][i]['title'] + ' ' + quizData['quizzes'][i]['quizId'];

//             // Optionally, set some attributes or styles
//             newDiv.setAttribute('class', 'dynamic-div');
//             newDiv.style.padding = '10px';
//             newDiv.style.border = '1px solid black';
//             newDiv.style.marginBottom = '5px';

//             // Append the new div to the container
//             container.appendChild(newDiv);
//         }
//     } catch (error) {
//         console.error('Error handling API data:', error);
//     }
// });







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

// Add event listener to the button to call the fetchQuizzes function
document.getElementById('apiButton').addEventListener('click', async () => {
    try {
        const apiData = await fetchQuizzes();
        // const quizData = JSON.parse(apiData);
        // console.log(apiData);
        document.getElementById('quizTitle').innerText = quizData;

        // document.getElementById('quizTitle').innerText = JSON.stringify(apiData['quizzes'][1]['title'], null, 2).replace(/['"]+/g, '');
        document.getElementById('quizTitle').innerText = JSON.stringify(apiData['quizzes'][1]['title'], null, 2).replace(/['"]+/g, '');
        document.getElementById('apiResponse').innerText = JSON.stringify(apiData, null, 2);

        // Get the parent container element
        const container = document.getElementById('quiz-options-container')

        // Create and append 5 new div elements in a loop
        for (let i = 1; i <= 3; i++) {
            // Create a new div element
            const newDiv = document.createElement('div');

            // Set the content of the new div
            newDiv.innerText = `This is div number ${i}`;

            // Optionally, set some attributes or styles
            newDiv.setAttribute('class', 'dynamic-div');
            newDiv.style.padding = '10px';
            newDiv.style.border = '1px solid black';
            newDiv.style.marginBottom = '5px';

            // Append the new div to the container
            container.appendChild(newDiv);
        }



    } catch (error) {
        console.error('Error handling API data:', error);
    }
});
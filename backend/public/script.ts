function sendRequest() {
	fetch("http://localhost:8000/send-question", {
		method: "POST",
		headers: {
			"Content-Type": "application/json" 
		},
		body: JSON.stringify({
			question: "This is a test"
		})
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			console.log("Response from server:", data);
		})
		.catch(error => {
			console.error("Error sending request:", error);
		});
}

const generateButton = document
	.querySelector("#generateBtn")!
	.addEventListener("click", sendRequest);

function sendRequest() {
	const question = (
		document.querySelector("#questionInput") as HTMLInputElement
	).value;

	fetch("http://localhost:8000/send-question", {
		method: "POST",
		headers: {
			"Content-Type": "text/plain"
		},
		body: question
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}
			return response.text();
		})
		.then(data => {
			console.log(data);
		})
		.catch(error => {
			console.error("Error sending request:", error);
		});
}

const generateButton = document
	.querySelector("#generateBtn")!
	.addEventListener("click", sendRequest);

import express, { Request, Response } from "express";
import axios from "axios";
import { load } from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from "readline"; // only for testing
import { getPrompt1, getPrompt2 } from "./prompts";
import fs from "fs"; // only for testing
import chalk from "chalk"; // only for testing
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = 8000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

export interface CatalogLinkData {
	text: string;
	href: string;
}

export interface PageData {
	linkRef: string;
	content: string;
}

async function getPageContent(href: string): Promise<PageData> {
	const page = await axios.get(href);
	const pageDataHTML = page.data;
	const $ = load(pageDataHTML);
	const pageContent = $(".block_content");

	return {
		linkRef: href,
		content: pageContent.text().replace(/\s+/g, " ").trim()
	};
}

function askAI(gradCISCatalogLinks: CatalogLinkData[]) {
	rl.question(
		"Please enter a question regarding the UD CIS grad program: ",
		async question => {
			const prompt = getPrompt1(question, gradCISCatalogLinks);
			const result = await model.generateContent(prompt);
			const response = await result.response;
			const text = response.text();

			if (text !== "N/A") {
				const hrefList = text.split(",");
				const pageTexts: PageData[] | PageData = await Promise.all(
					hrefList.map(getPageContent)
				);
				const prompt = getPrompt2(question, hrefList, pageTexts);

				// Handles live AI text generation in terminal via content streaming
				const result = await model.generateContentStream(prompt);
				for await (const chunk of result.stream) {
					const text = chunk.text();
					if (text) {
						process.stdout.write(chalk.greenBright(text));

						// For better readability, the AI's response is sent to an 'answers.txt' file that gets created
						const result = await model.generateContent(prompt);
						const response = await result.response;
						const answer = response.text();
						fs.writeFile("answer.txt", answer, error => {
							console.log(error);
						});
					}
				}
			} else {
				console.log("Could not find any applicable reference links for query");
			}
		}
	);
}

export async function createDataSourceJSON(): Promise<CatalogLinkData[]> {
	const gradCISCatalog = await axios.get(
		"https://catalog.udel.edu/content.php?catoid=93&navoid=30534"
	);
	const gradCISCatalogHTML = gradCISCatalog.data;
	const $ = load(gradCISCatalogHTML);
	const links = $("#data_p_11725");
	const gradCISCatalogLinks: CatalogLinkData[] = $(links)
		.find("a")
		.map((_, el) => {
			return {
				text: $(el).text().trim(),
				href: `https://catalog.udel.edu/${$(el).attr("href")}`
			};
		})
		.get();

	gradCISCatalogLinks.push({
		text: "Department of Computer and Information Sciences",
		href: "https://catalog.udel.edu/preview_entity.php?catoid=93&ent_oid=11725&returnto=30534"
	});

	return gradCISCatalogLinks;
}

app.get("/", async (req: Request, res: Response) => {
	// the frontend will send in their question through req.body; for the time being, questions are being inputted through the terminal

	const gradCISCatalogLinks = await createDataSourceJSON();
	askAI(gradCISCatalogLinks);

	res.json(gradCISCatalogLinks);
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

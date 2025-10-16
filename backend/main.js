"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDataSourceJSON = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const generative_ai_1 = require("@google/generative-ai");
const prompts_1 = require("./prompts");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.use(express_1.default.text());
const PORT = process.env.PORT || 8000;
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
function getPageContent(href) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = yield axios_1.default.get(href);
        const pageDataHTML = page.data;
        const $ = (0, cheerio_1.load)(pageDataHTML);
        const pageContent = $(".block_content");
        return {
            linkRef: href,
            content: pageContent.html()
        };
    });
}
function askAI(gradCISCatalogLinks, question) {
    return __awaiter(this, void 0, void 0, function* () {
        if (question) {
            const prompt = (0, prompts_1.getPrompt1)(question, gradCISCatalogLinks);
            const result = yield model.generateContent(prompt);
            const response = yield result.response;
            const text = response.text();
            if (text !== "N/A") {
                const hrefList = text.split(",");
                const pageTexts = yield Promise.all(hrefList.map(getPageContent));
                const prompt = (0, prompts_1.getPrompt2)(question, hrefList, pageTexts);
                const result = yield model.generateContent(prompt);
                const response = yield result.response;
                const answer = response.text();
                return answer;
                // Handles live AI text generation in terminal via content streaming
                // const result = await model.generateContentStream(prompt);
                // for await (const chunk of result.stream) {
                // 	const text = chunk.text();
                // 	if (text) {
                // 		process.stdout.write(chalk.greenBright(text));
                // 		// For better readability, the AI's response is sent to an 'answers.txt' file that gets created
                // 		const result = await model.generateContent(prompt);
                // 		const response = await result.response;
                // 		const answer = response.text();
                // fs.writeFile("answer.txt", answer, error => {
                // 	if (error) {
                // 		console.error(chalk.redBright(error));
                // 	}
                // });
                // 		return answer;
                // 	}
                // }
            }
            else {
                return "Please keep your questions focused on the UD CIS graduate program.";
            }
        }
    });
}
function createDataSourceJSON() {
    return __awaiter(this, void 0, void 0, function* () {
        const gradCISCatalog = yield axios_1.default.get("https://catalog.udel.edu/content.php?catoid=93&navoid=30534");
        const gradCISCatalogHTML = gradCISCatalog.data;
        const $ = (0, cheerio_1.load)(gradCISCatalogHTML);
        const links = $("#data_p_11725");
        const gradCISCatalogLinks = $(links)
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
    });
}
exports.createDataSourceJSON = createDataSourceJSON;
app.post("/send-question", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const question = req.body;
    console.log("received:", question);
    const gradCISCatalogLinks = yield createDataSourceJSON();
    const answer = yield askAI(gradCISCatalogLinks, question);
    console.log("answer received and sent to frontend");
    res.status(200).send(answer);
}));
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "./public/index.html"));
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

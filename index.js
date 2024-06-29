import { express } from 'express';
import { fs } from 'fs';
import { axios } from 'axios';

const app = express();
const port = 3000;

app.use(express.json());

app.post('/webhook', async (req, res) => {
    const commitData = req.body;

    try {
        const explanations = await processCommitData(commitData);
        saveExplanationsToFile(explanations);
        res.status(200).send('Commit data processed and explanation saved.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing commit data.');
    }
});

const processCommitData = async (commitData) => {
    const explanations = [];

    for (const commit of commitData.commits) {
        const message = commit.message;
        const url = commit.url;
        const changes = commit.modified.concat(commit.added).concat(commit.removed);
        const changeDescription = changes.join(', ');

        const prompt = `Commit message: ${message}\nFiles changed: ${changeDescription}\nPlease explain these changes in detail as a high-level software engineer and explain it like I was a junior developer:`;

        const explanation = await getLLMExplanation(prompt);
        explanations.push({ message, url, explanation });
    }

    return explanations;
};

const getLLMExplanation = async (prompt) => {
    const apiKey = 'OLLAMA_API_KEY';
    const response = await axios.post('http://localhost:11435/v1/generate', {
        prompt: prompt,
        model: 'MODEL-HERE',
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].text.trim();
};

const saveExplanationsToFile = (explanations) => {
    const filePath = 'commit_explanations.txt';
    let fileContent = '';

    explanations.forEach((explanation) => {
        fileContent += `Commit URL: ${explanation.url}\n`;
        fileContent += `Message: ${explanation.message}\n`;
        fileContent += `Explanation: ${explanation.explanation}\n\n`;
    });

    fs.writeFileSync(filePath, fileContent);
};

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

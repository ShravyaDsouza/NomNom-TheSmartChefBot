# NomNom - The Smart ChefBot
An AI-powered recipe assistant that generates meals from ingredients, finds similar dishes, and estimates nutrition in a chat-style web app.

## Problem Statement
Home cooks often know what ingredients they have, but not what to make with them. They also struggle to quickly discover related recipes or estimate the nutritional value of a meal without jumping between multiple apps. NomNom brings these tasks into a single conversational interface.

## Screenshots / UI Preview
The current repository does not include exported screenshot assets yet.

UI highlights from the implemented interface:
- Chat-style recipe assistant layout
- Quick action cards for `Similar Recipe Finder`, `I'm feeling lucky`, and `Nutrition info`
- Voice input using browser speech recognition
- Text-to-speech playback for bot responses
- Macronutrient pie chart for nutrition output

Suggested screenshots to add later:
- Home chat screen
- AI-generated recipe response
- Similar recipe selection flow
- Nutrition summary with macro chart

## Key Features
- AI recipe generation from user-provided ingredients using `flax-community/t5-recipe-generation`
- Similar recipe retrieval using `SentenceTransformer` embeddings, cosine similarity, and FAISS indexing
- Nutrition analysis through the Spoonacular ingredient parsing API
- Interactive chat UI with button-based flows
- Voice input support via `webkitSpeechRecognition`
- Spoken bot responses via browser text-to-speech
- Visual macro breakdown using Chart.js

## Tech Stack
- Backend: Python, Flask
- ML/NLP: Hugging Face Transformers, Sentence Transformers, scikit-learn, FAISS
- Frontend: HTML, CSS, JavaScript, Bootstrap 5, Font Awesome, Chart.js
- Data: Local cleaned recipe dataset and precomputed embedding artifacts
- External API: Spoonacular Nutrition API

## Architecture / Workflow
1. User opens the Flask web app and interacts through the chat interface.
2. The frontend routes the request based on the selected action.
3. For `I'm feeling lucky`, the app sends ingredients to the `/lucky` endpoint.
4. The backend runs a T5 text-to-text generation pipeline and returns a generated recipe.
5. For `Similar Recipe Finder`, the app sends a dish name or description to `/similar`.
6. The backend embeds the query with `all-MiniLM-L6-v2`, compares it with stored recipe embeddings, and uses FAISS-based retrieval to return the top 5 closest matches.
7. For `Nutrition info`, the app sends ingredients to `/nutrition`.
8. The backend calls Spoonacular, extracts calories, protein, fat, and carbs, and returns structured results.
9. The frontend renders the response as chat bubbles and, for nutrition, draws a pie chart of the macro distribution.

## Results / Performance
- Uses a cleaned recipe dataset with `1090` recipe records in `data/nomnom_clean_recipes.json`
- Returns the top `5` most similar recipes for semantic recipe lookup
- Stores precomputed embedding artifacts alongside a FAISS index in `find_similar_recipe/` for faster retrieval at runtime
- Nutrition results include per-ingredient calories, protein, fat, carbs, and total calories

Note:
Performance will depend on local model loading time, available RAM/CPU, and network latency for Spoonacular API requests.

## How to Run
### 1. Clone the project
```bash
git clone https://github.com/ShravyaDsouza/NomNom-TheSmartChefBot 
cd NomNom-TheSmartChefBot
```

### 2. Create and activate a virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
pip install flask python-dotenv requests pandas
```

### 4. Add environment variables
Create a `.env` file in the project root:

```env
SPOONACULAR_API_KEY=your_api_key_here
```

### 5. Start the app
```bash
python3 app.py
```

### 6. Open in browser
```text
http://127.0.0.1:5000
```

## Project Structure
```text
NomNom-TheSmartChefBot/
├── app.py
├── README.md
├── requirements.txt
├── NomNom.ipynb
├── data/
│   └── nomnom_clean_recipes.json
├── find_similar_recipe/
│   ├── sample_embeddings.pkl
│   └── sample_recipe_index.faiss
├── generate_ai_recipe/
│   └── feelinglucky.py
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── script.js
├── index.html
├── js/
│   └── script.js
└── sentencepiece/
```

### Folder Notes
- `app.py` contains the Flask server and all three active backend endpoints.
- `templates/` and `static/` are the frontend files actually used by Flask.
- `data/` stores the cleaned recipe dataset.
- `find_similar_recipe/` stores precomputed retrieval assets for semantic search.
- `generate_ai_recipe/feelinglucky.py` is a standalone test script for recipe generation.
- `NomNom.ipynb` appears to contain the experimentation and data preparation workflow.
- Root-level `index.html` and `js/script.js` duplicate the Flask-served frontend files.
- `sentencepiece/` is a large vendored dependency folder in the repository.

## Challenges & Learnings
- Combining local ML inference with a responsive web UI requires balancing model quality with startup time.
- Semantic retrieval is much faster when embeddings are precomputed and indexed with FAISS for quick lookup at runtime.
- Nutrition analysis is easier to maintain through an external API, but it introduces network and API-key dependency.
- Voice and text-to-speech features improve accessibility, but browser support can vary.
- Keeping the project organized matters: this repo currently includes duplicate frontend files and a vendored dependency directory that make the structure noisier than necessary.
- While reviewing the code, I also found a frontend call to `/search`, but there is no matching backend route yet. The three working flows are `/lucky`, `/similar`, and `/nutrition`.

## Future Improvements
- Add a working `/search` route for general recipe search
- Export and include real screenshots or GIF demos in the README
- Move duplicated root frontend files out of the main code path
- Replace the vendored `sentencepiece/` folder with dependency-based installation if possible
- Add better error messages for missing API keys and failed external API requests
- Cache or lazy-load models to improve startup performance
- Add tests for Flask endpoints and frontend interaction flows
- Deploy the project on Render, Railway, or Hugging Face Spaces
- Add filtering for cuisine, calories, prep time, and dietary preferences
- Show confidence or similarity scores in the UI for retrieved recipes

from flask import Flask, request, jsonify, render_template
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
import pickle
import numpy as np
import pandas as pd
import requests
import os

app = Flask(__name__)


load_dotenv()
API_KEY = os.getenv("SPOONACULAR_API_KEY")

# ----------------------------- #
# 1. T5-based Lucky Generator
pipe = pipeline("text2text-generation", model="flax-community/t5-recipe-generation")

# 2. SentenceTransformer for Similar Recipes
model = SentenceTransformer("all-MiniLM-L6-v2")

with open("find_similar_recipe/sample_embeddings.pkl", "rb") as f:
    sample_embeddings, sampled_df = pickle.load(f)

# ----------------------------- #
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/lucky', methods=['POST'])
def lucky_recipe():
    query = request.form.get('query', '')
    if not query:
        return jsonify({"error": "No ingredients provided"}), 400

    input_text = f"Ingredients: {query}"
    result = pipe(input_text, max_length=150, num_beams=4, early_stopping=True)
    return jsonify({"recipe": result[0]['generated_text']})

@app.route('/similar', methods=['POST'])
def similar_recipe():
    query = request.form.get('query', '')
    if not query:
        return jsonify({"error": "No query provided"}), 400

    query_vector = model.encode([query])
    similarities = cosine_similarity(query_vector, sample_embeddings)[0]
    top_indices = similarities.argsort()[-5:][::-1]

    results = []
    for idx in top_indices:
        row = sampled_df.iloc[idx]
        results.append({
            "name": row['name'],
            "ingredients": row['ingredients'],
            "steps": row['steps'],
            "score": float(similarities[idx])
        })

    return jsonify({"results": results})

@app.route('/nutrition', methods=['POST'])
def get_nutrition():
    ingredients = request.form.get('query', '')
    if not ingredients:
        return jsonify({'error': 'No ingredients provided'}), 400
    formatted_ingredients = "\n".join([i.strip() for i in ingredients.split(',') if i.strip()])

    url = "https://api.spoonacular.com/recipes/parseIngredients"
    params = {
        'apiKey': API_KEY,
        'includeNutrition': True
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}

    response = requests.post(url, params=params, data={
        'ingredientList': ingredients.strip(),
        'servings': 1
    }, headers=headers)

    if response.status_code != 200:
        return jsonify({'error': 'API call failed'}), 500

    data = response.json()
    if not data or not isinstance(data, list):
        return jsonify({'error': 'No nutrition data returned'}), 404

    nutrition_data = []
    total_calories = 0.0

    for item in data:
        name = item.get("name", "Unknown")
        amount = item.get("amount", "N/A")
        unit = item.get("unit", "")
        nutrients = item.get("nutrition", {}).get("nutrients", [])

        # Extract calories, protein, fat, carbs
        get_nutrient = lambda n: next((x['amount'] for x in nutrients if x['name'].lower() == n.lower()), 0.0)
        calories = get_nutrient("Calories")
        protein = get_nutrient("Protein")
        fat = get_nutrient("Fat")
        carbs = get_nutrient("Carbohydrates")

        nutrition_data.append({
            "name": name,
            "amount": amount,
            "unit": unit,
            "calories": round(calories, 2),
            "protein": round(protein, 2),
            "fat": round(fat, 2),
            "carbs": round(carbs, 2)
        })

        total_calories += calories

    return jsonify({
        "total_calories": round(total_calories, 2),
        "details": nutrition_data
    })

# ----------------------------- #
if __name__ == '__main__':
    app.run(debug=True)

from transformers import pipeline

pipe = pipeline("text2text-generation", model="flax-community/t5-recipe-generation")

input_text = "Ingredients: tomato, onion, garlic, paneer"

result = pipe(input_text, max_length=150, num_beams=4, early_stopping=True)

print("Generated Recipe:\n", result[0]['generated_text'])

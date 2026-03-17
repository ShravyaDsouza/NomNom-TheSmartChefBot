const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

        userInput.addEventListener('input', () => {
            sendBtn.disabled = userInput.value.trim() === '';
        });

        function addMessage(sender, text, speakNow = false) {
            const message = document.createElement('div');
            message.className = `message ${sender}-message`;
            message.innerHTML = text.replace(/\n/g, "<br>");
            chatMessages.appendChild(message);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            if (sender === 'bot' && speakNow) {
                const utter = new SpeechSynthesisUtterance(text.replace(/<[^>]*>?/gm, ''));
                utter.lang = 'en-US';
                utter.rate = 1;
                speechSynthesis.speak(utter);
            }
        }

        let awaitingLuckyIngredients = false;
        let awaitingSimilarRecipe = false;
        let awaitingNutrition = false;

        function selectOption(optionText) {
            console.log("Option clicked:", optionText);

            if (optionText === "Im feeling lucky") {
                awaitingLuckyIngredients = true; // Flag to trigger next input as ingredients
                addMessage('bot', "🎲 Tell me what ingredients you have, and I’ll surprise you with a recipe!");
                userInput.placeholder = "e.g., tomatoes, cheese, pasta";
                return;
            }
             else if (optionText === "Generate a similar recipe") {
                awaitingSimilarRecipe = true;
                addMessage('bot', "🔍 Please enter the dish name or description you'd like me to find similar recipes for.");
                userInput.placeholder = "e.g., creamy mushroom pasta";
                return;
             }
             else if (optionText === "Give me nutrition facts") {
                     awaitingNutrition = true;
                    addMessage('bot', "🥦 Please enter the ingredients separated by commas (e.g., 2 boiled eggs, 1 banana, 1 tsp butter)");
                    userInput.placeholder = "Enter ingredients for nutrition info...";
                    return;
             }
                else {
                userInput.value = optionText;
                sendBtn.disabled = false;
                sendMessage();
            }
        }

        async function sendMessage() {
            const query = userInput.value.trim();
            if (!query) return;

            addMessage('user', query);
            userInput.value = '';
            sendBtn.disabled = true;
            userInput.placeholder = "What can I cook today?";

            if (awaitingNutrition) {
            const ingredients =query.replace(/,/g, '\n');
            if (!ingredients) return;

            addMessage('bot', "🥗 Analyzing the nutritional content...");

            fetch('/nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `query=${encodeURIComponent(ingredients)}`
            })
            .then(res => res.json())
            .then(data => {
                if (data.details && data.details.length > 0) {
                    let message = `<strong>🧪 Nutrition Summary:</strong><br><ul>`;
                    data.details.forEach(item => {
                        message += `<li><strong>${item.name}</strong> – ${item.calories} kcal, ${item.protein}g protein, ${item.fat}g fat, ${item.carbs}g carbs</li>`;
                    });
                    message += `</ul><strong>🔥 Total Calories:</strong> ${data.total_calories} kcal`;

                    addMessage('bot', message, true);
                    // Calculate total macros
                    let totalProtein = 0, totalFat = 0, totalCarbs = 0;

                    data.details.forEach(item => {
                        totalProtein += parseFloat(item.protein || 0);
                        totalFat += parseFloat(item.fat || 0);
                        totalCarbs += parseFloat(item.carbs || 0);
                    });

                    const chartBubble = document.createElement("div");
                    chartBubble.className = "message bot-message";  // make it look like a normal bot reply

                    // Add styling so it doesn't overflow
                    chartBubble.style.padding = "10px";
                    chartBubble.style.borderRadius = "12px";
                    chartBubble.style.backgroundColor = "#f7f7f7";
                    chartBubble.style.margin = "10px 0";
                    chartBubble.style.display = "flex";
                    chartBubble.style.justifyContent = "center";

                    const chartCanvas = document.createElement("canvas");
                    chartCanvas.id = "macroChart";
                    chartCanvas.width = 200;
                    chartCanvas.height = 200;

                    chartBubble.appendChild(chartCanvas);
                    chatMessages.appendChild(chartBubble);

                    setTimeout(() => {
                        const ctx = document.getElementById('macroChart').getContext('2d');
                        new Chart(ctx, {
                            type: 'pie',
                            data: {
                                labels: ['Protein (g)', 'Fat (g)', 'Carbs (g)'],
                                datasets: [{
                                    data: [totalProtein.toFixed(2), totalFat.toFixed(2), totalCarbs.toFixed(2)],
                                    backgroundColor: ['#4caf50', '#ff9800', '#03a9f4']
                                }]
                            },
                            options: {
                                responsive: false,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' },
                                    title: {
                                        display: true,
                                        text: 'Macronutrient Distribution',
                                        font: { size: 14 }
                                    }
                                }
                            }
                        });
                    }, 200);
                    } else {
                        addMessage('bot', "⚠️ Couldn't get nutrition data. Please try again.");
                    }
                })
                .catch(() => {
                    addMessage('bot', "❌ Something went wrong while fetching nutrition info.");
                });

                awaitingNutrition = false;
                userInput.value = '';
                sendBtn.disabled = true;
                userInput.placeholder = "What can I cook today?";
                return;
            }

            if (awaitingLuckyIngredients) {
            awaitingLuckyIngredients = false;

            const ingredients = query;
            addMessage('bot', "🎲 Let me work my magic...");

            try {
                const res = await fetch('/lucky', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `query=${encodeURIComponent(ingredients)}`
                });

                const data = await res.json();
                if (data.recipe) {
                    // Clean and parse the recipe
                    const recipeText = data.recipe;
                    let titleMatch = recipeText.match(/title:\s*(.*?)\s*ingredients:/i);
                    let ingredientsMatch = recipeText.match(/ingredients:\s*(.*?)\s*directions:/is);
                    let directionsMatch = recipeText.match(/directions:\s*(.*)/is);

                    let title = titleMatch ? titleMatch[1].trim() : "Unnamed Dish";
                    let ingredients = ingredientsMatch ? ingredientsMatch[1].split(/[\d]+\./).filter(i => i.trim()).map(i => i.trim()) : [];
                    let steps = directionsMatch ? directionsMatch[1].split(/[\d]+\./).filter(s => s.trim()).map(s => s.trim()) : [];

                    let message = `<strong>Here's a recipe I whipped up just for you! 🍳</strong><br><br>`;
                    message += `<h5>🥣 ${title}</h5>`;

                    if (ingredients.length) {
                        message += `<strong>🧂 Ingredients:</strong><ul>`;
                        ingredients.forEach(ing => {
                            message += `<li>${ing}</li>`;
                        });
                        message += `</ul>`;
                    }

                    if (steps.length) {
                        message += `<strong>👨‍🍳 Directions:</strong><ol>`;
                        steps.forEach(step => {
                            message += `<li>${step}</li>`;
                        });
                        message += `</ol>`;
                    }

                    addMessage('bot', message, true);
                    window.lastBotReply = message;
                    // Ask for the next action after recipe is shown
                    setTimeout(() => {
                        const followUpOptions = `
                            <div class="option-card">
                                <div class="option-grid">
                                    <button onclick="handleFollowUpOption('step by step')"><i class="fas fa-list-ul me-2"></i>Step by step</button>
                                    <button onclick="handleFollowUpOption('another')"><i class="fas fa-random me-2"></i>Another recipe</button>
                                </div>
                            </div>
                        `;

                        addMessage('bot', "👀 What would you like to do next?<br>" + followUpOptions);

                        const handleFollowUp = (event) => {
                            const reply = event.target.value.trim().toLowerCase();

                            if (reply === 'step by step') {
                                const steps = message.match(/<li>(.*?)<\/li>/g)?.map(step =>
                                    step.replace(/<[^>]*>/g, '')
                                );

                                if (steps && steps.length) {
                                    let stepIndex = 0;
                                    const readStep = () => {
                                        if (stepIndex < steps.length) {
                                            const stepText = `Step ${stepIndex + 1}: ${steps[stepIndex]}`;
                                            addMessage('bot', stepText, true);
                                            stepIndex++;
                                            setTimeout(readStep, 5000);
                                        } else {
                                            addMessage('bot', "👩‍🍳 That's it! Bon appétit!");
                                        }
                                    };
                                    readStep();
                                }
                            } else if (reply === 'another') {
                                addMessage('bot', "🔄 Alright! Hit the 'I'm feeling lucky' button again for a new surprise recipe.");
                            }

                            userInput.removeEventListener('change', handleFollowUp);
                        };

                        userInput.addEventListener('change', handleFollowUp);
                    }, 600);
                } else {
                    addMessage('bot', "Hmm... I couldn't generate a recipe this time. Try again?");
                }
            } catch {
                addMessage('bot', 'Sorry, something went wrong while fetching the recipe.');
            }

            return;
        }
            if (awaitingSimilarRecipe) {
                const userQuery = query;
                awaitingSimilarRecipe = false;

                addMessage('bot', "🔍 Finding recipes similar to that...");

                try {
                    const res = await fetch('/similar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `query=${encodeURIComponent(userQuery)}`
                    });

                    const data = await res.json();

                    if (data.results && data.results.length > 0) {
                        window.similarRecipes = data.results;  // Store recipes globally for selection

                        let recipeButtons = `<strong>🔍 Similar Recipes Found:</strong><br><div class="option-card"><div class="option-grid">`;

                        data.results.forEach((recipe, index) => {
                            recipeButtons += `<button onclick="showSimilarRecipe(${index})">🍽️ ${recipe.name}</button>`;
                        });

                        recipeButtons += `</div></div>`;
                        addMessage('bot', recipeButtons);
                    } else {
                        addMessage('bot', "😕 No similar recipes found. Try something else?");
                    }
                } catch {
                    addMessage('bot', '❌ Error fetching similar recipes.');
                }

                userInput.value = '';
                sendBtn.disabled = true;
                userInput.placeholder = "What can I cook today?";
                return;
            }

            // Handle normal search
            try {
                const res = await fetch('/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `query=${encodeURIComponent(query)}`
                });

                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    let response = "Here are some recipes you might like:\n";
                    data.results.forEach(recipe => {
                        response += `🍽️ <strong>${recipe.name}</strong><br><em>${recipe.ingredients}</em><br><br>`;
                    });
                    window.lastBotReply = response;
                    addMessage('bot', response);

                    setTimeout(() => {
                        addMessage('bot', "Would you like me to read the instructions out loud? (yes/no)");
                    }, 500);
                } else {
                    addMessage('bot', "Sorry, I couldn't find any recipes. Try different ingredients?");
                }
            } catch {
                addMessage('bot', 'Oops! Something went wrong.');
            }
        }
function showSimilarRecipe(index) {
    const recipe = window.similarRecipes[index];
    if (!recipe) {
        addMessage('bot', "❌ Couldn't load the recipe.");
        return;
    }

    let response = `<strong>🍽️ ${recipe.name}</strong><br><ul>`;

    // Parse ingredients
    let ingredients = recipe.ingredients;
    if (typeof ingredients === "string") {
        try {
            ingredients = JSON.parse(ingredients);
        } catch {
            ingredients = [];
        }
    }

    if (Array.isArray(ingredients) && ingredients.length > 0) {
        ingredients.forEach(ing => {
            response += `<li>${ing}</li>`;
        });
    } else {
        response += `<li>Ingredients not available</li>`;
    }
    response += `</ul>`;

    // Steps
    let steps = recipe.directions || recipe.steps || [];
    if (typeof steps === "string") {
        try {
            steps = JSON.parse(steps);
        } catch {
            steps = steps.split(/[\d]+\./).filter(s => s.trim());
        }
    }

    if (Array.isArray(steps) && steps.length > 0) {
        response += `<strong>👨‍🍳 Steps:</strong><ol>`;
        steps.forEach(step => {
            response += `<li>${step}</li>`;
        });
        response += `</ol>`;
        window.lastBotReply = steps;
    } else {
        response += `<p>No steps found.</p>`;
    }

    addMessage('bot', response, true);
    renderFollowUpOptions("Generate a similar recipe");
}

const followUpHandler = (event) => {
    const userReply = event.target.value.trim().toLowerCase();

    if (userReply === 'yes') {
        if (window.lastBotReply) {
            addMessage('bot', "📣 Reading it out loud...", true);
            addMessage('bot', window.lastBotReply, true);
        }
    }

    if (userReply === 'step by step') {
        const steps = window.lastBotReply.match(/<li>(.*?)<\/li>/g)?.map(step =>
            step.replace(/<[^>]*>/g, '')
        );

        if (steps && steps.length) {
            let stepIndex = 0;
            const readStep = () => {
                if (stepIndex < steps.length) {
                    const stepText = `Step ${stepIndex + 1}: ${steps[stepIndex]}`;
                    addMessage('bot', stepText, true);
                    stepIndex++;
                    setTimeout(readStep, 5000);
                } else {
                    addMessage('bot', "👩‍🍳 That's it! You're done.");
                }
            };
            readStep();
        }
    }

    userInput.removeEventListener('change', followUpHandler);
};

userInput.addEventListener('change', followUpHandler);
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});


        // Optional Voice Input
       function startVoice() {
            if (!('webkitSpeechRecognition' in window)) {
                alert('Voice recognition is not supported in your browser.');
                return;
            }

            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                userInput.placeholder = "Listening...";
            };

            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                userInput.value = transcript;
                sendBtn.disabled = false;
                sendMessage(); // 🚀 auto-send
            };

            recognition.onerror = (e) => {
                console.error("Speech recognition error:", e.error);
                userInput.placeholder = "Try again...";
            };

            recognition.onend = () => {
                userInput.placeholder = "What can I cook today?";
            };

            recognition.start();
        }

        // Initial greeting
        window.onload = () => {
            // First intro block
            addMessage('bot', "👋 Hello! I'm <strong>NomNom</strong>, your culinary assistant.");

            // Second block with options
            setTimeout(() => {
                const optionsHTML = `
                <div class="option-card">
                    <div class="option-grid">
                    <button onclick="selectOption('Generate a similar recipe')" title="Find recipes similar to your favorite dish"><i class="fas fa-utensils me-2"></i>Similar Recipe Finder</button>
                        <button onclick="selectOption('Im feeling lucky')"><i class="fas fa-dice me-2"></i>I’m feeling lucky</button>
                        <button onclick="selectOption('Give me nutrition facts')"><i class="fas fa-chart-pie me-2"></i>Nutrition info</button>
                    </div>
                </div>
                `;

                addMessage('bot', "What would you like help with today?<br>" + optionsHTML);
            }, 1000);
        }
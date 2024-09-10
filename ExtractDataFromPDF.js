const fs = require('fs');
const pdf = require('pdf-parse');

const extractWorkoutPlan = async (pdfPath) => {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);

    console.log("Texto extraído do PDF:\n", data.text);

    const rawText = data.text;

    const parseWorkoutText = (text) => {
        const sections = text.split(/(Workout\s[A|B])/); 
        const workoutPlan = {};

        let currentWorkout = null;

        sections.forEach((section, index) => {
            const sectionTrimmed = section.trim();
            
            if (sectionTrimmed.startsWith("Workout")) {
                currentWorkout = sectionTrimmed;
                workoutPlan[currentWorkout] = [];
            } else if (currentWorkout) {
                const lines = sectionTrimmed.split("\n");

                const cleanLines = lines.map(line => line.replace(/\s\s+/g, ' ').trim()).filter(line => line);

                cleanLines.forEach(line => {
                    const match = line.match(/(.+?)\s+(\d+)\s+(\d+\s*-\s*\d+)/);
                    if (match) {
                        workoutPlan[currentWorkout].push({
                            exercise: match[1].trim(),
                            sets: match[2].trim(),
                            reps: match[3].trim()
                        });
                    }
                });
            }
        });

        return workoutPlan;
    };

    const workoutPlan = parseWorkoutText(rawText);
    console.log("Plano de treino extraído:", workoutPlan);
    return workoutPlan;
};

const pdfFilePath = './Treinos/4daymusclebuildingworkoutpplsplitwithvtaperintensifier.pdf';

extractWorkoutPlan(pdfFilePath);

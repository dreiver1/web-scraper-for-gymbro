import pdfplumber
import pandas as pd
import json
import re
import os

def parse_text(text):
    data = {
        'tables': [],
        'details': {
            'title': '',
            'main_goal': '',
            'equipment': [],
            'training_level': '',
            'target_gender': '',
            'days_per_week': 0,
            'author': '',
            'summary': '',
            'days': []
        },
        'source': ''
    }
    
    title_match = re.search(r'^(.+?)(?=\n)', text)
    main_goal_match = re.search(r'Main Goal: (.+)', text)
    equipment_match = re.search(r'Equipment: (.+)', text)
    training_level_match = re.search(r'Workout Training Level: (.+)', text)
    target_gender_match = re.search(r'Target Gender: (.+)', text)
    days_per_week_match = re.search(r'Days Per Week: (\d+)', text)
    author_match = re.search(r'Author: (.+)', text)
    summary_match = re.search(r'Summary\s*(.+?)(?=\n\n|$)', text, re.DOTALL)
    
    if title_match:
        data['details']['title'] = title_match.group(1).strip()
    
    if main_goal_match:
        data['details']['main_goal'] = main_goal_match.group(1).strip()
    
    if equipment_match:
        data['details']['equipment'] = [item.strip() for item in equipment_match.group(1).split(',')]
    
    if training_level_match:
        data['details']['training_level'] = training_level_match.group(1).strip()
    
    if target_gender_match:
        data['details']['target_gender'] = target_gender_match.group(1).strip()
    
    if days_per_week_match:
        data['details']['days_per_week'] = int(days_per_week_match.group(1).strip())
    
    if author_match:
        data['details']['author'] = author_match.group(1).strip()
    
    if summary_match:
        data['details']['summary'] = summary_match.group(1).strip()

    day_matches = re.findall(r'Day (\d+) - (.+?)(?=\nDay \d+ - |\Z)', text, re.DOTALL)
    for day_number, day_title in day_matches:
        exercises = []
        exercise_lines = day_title.strip().split('\n')[1:]
        for line in exercise_lines:
            line = line.strip()
            if not line:
                continue
            
            parts = re.split(r'\s{2,}', line)  
            if len(parts) >= 3:
                exercise_name = ' '.join(parts[:-2])
                sets = parts[-2]
                reps = parts[-1]
                
                exercises.append({
                    'name': exercise_name,
                    'sets': sets,
                    'reps': reps
                })
        data['details']['days'].append({
            'day': int(day_number),
            'title': f'Day {day_number}',
            'exercises': exercises
        })
    return data

def rename_duplicate_columns(df):
    cols = pd.Series(df.columns)
    for dup in cols[cols.duplicated()].unique(): 
        cols[cols[cols == dup].index.values.tolist()] = [dup + '_' + str(i) if i != 0 else dup for i in range(sum(cols == dup))]
    df.columns = cols
    return df

def process_pdf(pdf_path):
    data = {
        'tables': [],
        'details': {
            'title': '',
            'main_goal': '',
            'equipment': [],
            'training_level': '',
            'target_gender': '',
            'days_per_week': 0,
            'author': '',
            'summary': '',
            'days': []
        },
        'source': pdf_path
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        all_text = ""
        for page in pdf.pages:
            for table in page.extract_tables():
                df = pd.DataFrame(table[1:], columns=table[0])
                df = rename_duplicate_columns(df)
                data['tables'].append(df.to_dict(orient='records'))

            text = page.extract_text()
            if text:
                all_text += text + "\n"

    if not all_text.strip():
        raise ValueError(f"Nenhum texto foi extraído do PDF: {pdf_path}")

    data['details'] = parse_text(all_text)['details']

    with open(f'{os.path.splitext(pdf_path)[0]}_texto_extraido.txt', 'w', encoding='utf-8') as f:
        f.write(all_text)

    with open(f'{os.path.splitext(pdf_path)[0]}_dados_extraidos.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def process_pdfs_in_folder(folder_path):
    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(folder_path, filename)
            print(f"Processando: {pdf_path}")
            process_pdf(pdf_path)

process_pdfs_in_folder('Treinos')

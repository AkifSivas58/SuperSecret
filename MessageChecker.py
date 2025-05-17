from transformers import AutoTokenizer, AutoModelForSequenceClassification ,AutoModelForSeq2SeqLM
import torch
import re

class Models:

    def __init__(self): 
        self.tokenizerUrl = AutoTokenizer.from_pretrained("kmack/malicious-url-detection")
        self.ModelUrl = AutoModelForSequenceClassification.from_pretrained("kmack/malicious-url-detection")
        self.tokenizerSpam = AutoTokenizer.from_pretrained("mshenoda/roberta-spam")
        self.ModelSpam = AutoModelForSequenceClassification.from_pretrained("mshenoda/roberta-spam")
        self.tokenizerTr_En = AutoTokenizer.from_pretrained("Helsinki-NLP/opus-mt-tc-big-tr-en")
        self.modelTr_En = AutoModelForSeq2SeqLM.from_pretrained("Helsinki-NLP/opus-mt-tc-big-tr-en")
        self.tokenizerToxic = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-offensive")
        self.modelToxic = AutoModelForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-offensive")

    def TR_EN(self,text):
        textC = [text]
        encoded = self.tokenizerTr_En(textC,return_tensors="pt",padding=True)
        Translated = self.modelTr_En.generate(**encoded)
        Translated = self.tokenizerTr_En.decode(Translated[0],skip_special_tokens = True)
        return Translated

    def SpamDetector(self,message):
        text = self.TR_EN(message)
        inputs = self.tokenizerSpam(text,return_tensors="pt",truncation = True , padding = True)
        with torch.no_grad():
            logits = self.ModelSpam(**inputs).logits
        predicted_class = logits.argmax().item()
        return (predicted_class == 1)
    
    def MaliciousUrl(self,text):
        url_list = re.findall(r"https?://\S+",text)
        for url in url_list:
            inputs = self.tokenizerUrl(url,return_tensors="pt", truncation=True, padding=True)
            with torch.no_grad():
                logits = self.MaliciousUrl(**inputs).logits
            predicted_class = logits.argmax().item()
            if predicted_class == 1 :
                return 1
        
        return 0
    
    def is_toxic(self,message):
        text = self.TR_EN(message)
        print(text)
        inputs = self.tokenizerToxic(text, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = self.modelToxic(**inputs)
        
           
    
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=1)
        pred_index = torch.argmax(probs, dim=1).item()
        return (pred_index == 1)
        
    # Backendde mesaj kontrol edilirken sadece bunun kullanılması yeter objeyi oluştur ve bunu çağır
    def IsBadMessage(self,message):
        MaliciousUrl = self.MaliciousUrl(message)
        SpamMessage = self.SpamDetector(message)
        Toxic = self.is_toxic(message)

        return ( MaliciousUrl | SpamMessage | Toxic )


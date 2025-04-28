package com.example.Comparator;

public class PromptRequest {
    private String prompt;

    // Default constructor for JSON deserialization
    public PromptRequest() {}

    public PromptRequest(String prompt) {
        this.prompt = prompt;
    }

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }
}

package com.example.Comparator;


public class PromptResponse {
    private String text;
    private int tokensUsed;
    private long timeTaken;

    // Default constructor for JSON serialization
    public PromptResponse() {}

    public PromptResponse(String text, int tokensUsed, long timeTaken) {
        this.text = text;
        this.tokensUsed = tokensUsed;
        this.timeTaken = timeTaken;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public int getTokensUsed() {
        return tokensUsed;
    }

    public void setTokensUsed(int tokensUsed) {
        this.tokensUsed = tokensUsed;
    }

    public long getTimeTaken() {
        return timeTaken;
    }

    public void setTimeTaken(long timeTaken) {
        this.timeTaken = timeTaken;
    }
}
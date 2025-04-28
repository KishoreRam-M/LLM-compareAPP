package com.example.Comparator;

import com.example.Comparator.OllamaAIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Enable CORS for development
public class AIController {

    private final OllamaAIService aiService;

    @Autowired
    public AIController(OllamaAIService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/prompt/{model}")
    public Mono<ResponseEntity<PromptResponse>> generatePrompt(
            @PathVariable String model,
            @RequestBody PromptRequest request) {

        return aiService.generateResponse(model, request.getPrompt())
                .map(response -> {
                    PromptResponse promptResponse = new PromptResponse(
                            response.getText(),
                            response.getTokensUsed(),
                            response.getTimeTaken()
                    );
                    return ResponseEntity.ok(promptResponse);
                })
                .onErrorResume(e -> Mono.just(
                        ResponseEntity.status(500).body(
                                new PromptResponse("Error: " + e.getMessage(), 0, 0)
                        )
                ));
    }

    // Model classes for request/response
    public static class PromptRequest {
        private String prompt;

        // Default constructor for Jackson
        public PromptRequest() {}

        public String getPrompt() {
            return prompt;
        }

        public void setPrompt(String prompt) {
            this.prompt = prompt;
        }
    }

    public static class PromptResponse {
        private String text;
        private int tokensUsed;
        private long timeTaken;

        // Default constructor for Jackson
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
}
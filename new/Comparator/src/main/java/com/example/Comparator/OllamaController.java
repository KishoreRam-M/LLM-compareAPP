package com.example.Comparator;



import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;


@RestController
@RequestMapping("/api/prompt")
@CrossOrigin(origins = "http://localhost:5173") // Update this if React runs elsewhere
public class OllamaController {

    @Autowired
    private OllamaAIService aiService;

    @PostMapping("/{model}")
    public Mono<String> prompt(@PathVariable String model, @RequestBody PromptRequest promptRequest) {
        return aiService.generateResponse(model, promptRequest.getPrompt());
    }

    public static class PromptRequest {
        private String prompt;

        public String getPrompt() {
            return prompt;
        }

        public void setPrompt(String prompt) {
            this.prompt = prompt;
        }
    }
}

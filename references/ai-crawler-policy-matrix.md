# AI crawler policy matrix

Never blindly allow or block a crawler. Verify operator documentation, DNS or
IP authenticity where possible, robots behavior, WAF behavior, and the business
choice for search, retrieval, training, fetching, previews, licensing, and
security. A robots directive cannot protect private content; authentication and
authorization must do that.

| Crawler | Purpose to distinguish | User-agent (verify current spelling) | Search indexing | AI retrieval | AI training | User-triggered fetch | Preview generation | Policy evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Googlebot family | Google Search crawling | Googlebot | yes | platform-dependent | separate policy where applicable | no | yes | Google crawler docs, robots, HTTP |
| Googlebot-Image | Image discovery | Googlebot-Image | image search | no assumption | no assumption | no | image previews | image HTTP/logs |
| Googlebot-News | News crawling | Googlebot-News | news surfaces | no assumption | no assumption | no | article previews | publisher/news evidence |
| Googlebot-Video | Video crawling | Googlebot-Video | video surfaces | no assumption | no assumption | no | video previews | video HTTP/logs |
| Google-Extended | Google AI training/grounding control where supported | Google-Extended | not a Search index control | product-dependent | policy signal | no | product-dependent | current Google docs |
| Bingbot | Bing Search crawling | bingbot | yes | Bing products | separate policy | no | yes | Bing docs, HTTP/logs |
| Other Microsoft crawlers | Product-specific crawling | verify operator token | product-dependent | product-dependent | unknown unless documented | no assumption | product-dependent | Microsoft docs |
| GPTBot | OpenAI model-training crawling | GPTBot | no Search assumption | no Search assumption | yes, policy-dependent | no | no assumption | OpenAI bot docs, logs |
| OAI-SearchBot | OpenAI search discovery where applicable | OAI-SearchBot | product-dependent | yes where documented | separate from GPTBot | no | product-dependent | current OpenAI docs |
| ChatGPT-User | User-triggered fetches | ChatGPT-User | no indexing assumption | user-triggered | no training assumption | yes | possible response context | OpenAI docs/logs |
| ClaudeBot | Anthropic crawling | ClaudeBot | no search assumption | product-dependent | product-dependent | no assumption | product-dependent | Anthropic docs/logs |
| Other Anthropic crawlers | Purpose-specific Anthropic access | verify operator token | unknown | unknown | unknown | unknown | unknown | current operator docs |
| PerplexityBot | Perplexity retrieval/search | PerplexityBot | product-dependent | yes where documented | separate policy | no assumption | answer context | operator docs/logs |
| Amazonbot | Amazon search/assistant crawling | Amazonbot | product-dependent | product-dependent | unknown | no assumption | product-dependent | Amazon docs/logs |
| Bytespider | ByteDance crawling | Bytespider | unknown | unknown | policy-dependent | no assumption | unknown | operator docs, WAF/logs |
| Applebot | Apple search/assistant crawling | Applebot | product-dependent | product-dependent | unknown | no assumption | product-dependent | Apple docs/logs |
| Meta crawlers | Social previews and product surfaces | verify Meta tokens | no Search assumption | product-dependent | no assumption | no assumption | yes | Meta docs/logs |

The registry records the policy decision, applicability, and evidence. It must
not treat a user-agent string alone as identity proof or recommend weakening a
WAF, paywall, or authentication boundary.

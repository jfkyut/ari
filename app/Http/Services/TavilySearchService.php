<?php

namespace App\Http\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class TavilySearchService
{
    private const MAX_RESULTS = 5;

    private const MAX_RESULT_CHARACTERS = 2000;

    private const MAX_PAGE_CHARACTERS = 12000;

    public function search(string $query): string
    {
        $key = config('services.tavily.key');

        if (! is_string($key) || $key === '') {
            throw new RuntimeException('The Tavily search service is not configured.');
        }

        $response = Http::withToken($key)
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(20)
            ->post('https://api.tavily.com/search', [
                'query' => $query,
                'search_depth' => 'basic',
                'max_results' => self::MAX_RESULTS,
                'include_answer' => false,
                'include_raw_content' => false,
                'include_published_date' => true,
            ])
            ->throw()
            ->json();

        $results = data_get($response, 'results');

        if (! is_array($results)) {
            throw new RuntimeException('The Tavily search service returned invalid results.');
        }

        $formattedResults = [];

        foreach (array_slice($results, 0, self::MAX_RESULTS) as $result) {
            if (! is_array($result)
                || ! is_string($result['title'] ?? null)
                || ! is_string($result['url'] ?? null)
                || ! is_string($result['content'] ?? null)
                || ! $this->isHttpUrl($result['url'])) {
                throw new RuntimeException('The Tavily search service returned an invalid result.');
            }

            $formattedResults[] = [
                'title' => Str::limit($result['title'], self::MAX_RESULT_CHARACTERS, ''),
                'url' => $result['url'],
                'published_date' => is_string($result['published_date'] ?? null)
                    ? $result['published_date']
                    : null,
                'content' => Str::limit($result['content'], self::MAX_RESULT_CHARACTERS, ''),
            ];
        }

        return json_encode([
            'query' => $query,
            'results' => $formattedResults,
        ], JSON_THROW_ON_ERROR);
    }

    public function extract(string $url): string
    {
        if (! $this->isHttpUrl($url)) {
            throw new RuntimeException('The LLM returned an invalid webpage URL.');
        }

        $key = config('services.tavily.key');

        if (! is_string($key) || $key === '') {
            throw new RuntimeException('The Tavily search service is not configured.');
        }

        $response = Http::withToken($key)
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(30)
            ->post('https://api.tavily.com/extract', [
                'urls' => $url,
                'format' => 'markdown',
                'extract_depth' => 'basic',
                'include_images' => false,
            ])
            ->throw()
            ->json();

        $result = data_get($response, 'results.0');

        if (! is_array($result) || ! is_string($result['raw_content'] ?? null)) {
            throw new RuntimeException('The Tavily search service could not extract the requested webpage.');
        }

        return json_encode([
            'url' => is_string($result['url'] ?? null) ? $result['url'] : $url,
            'content' => Str::limit($result['raw_content'], self::MAX_PAGE_CHARACTERS, ''),
        ], JSON_THROW_ON_ERROR);
    }

    private function isHttpUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false
            && in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true);
    }
}

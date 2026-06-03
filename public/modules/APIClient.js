export class APIClient {
  async analyzeRepository(formData) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Analysis request failed.');
    return response.json();
  }
}
export async function completeOnboarding(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_onboarded: true }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    return false;
  }
} 
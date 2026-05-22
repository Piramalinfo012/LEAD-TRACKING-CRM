async function testUrl() {
  const url = 'https://lh3.googleusercontent.com/d/1JMxnYSFnRexSD58dEu2vONDi4xQMIYUk';
  const res = await fetch(url);
  console.log('Status:', res.status, res.statusText);
  console.log('Headers:', res.headers);
}
testUrl();

import '@testing-library/jest-dom';

process.env.BURGER_API_URL = 'https://norma.education-services.ru/api';
document.body.innerHTML = '<div id="modals"></div>';

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));
Element.prototype.scrollIntoView = jest.fn();

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = 'accessToken=; max-age=0; path=/';
  jest.restoreAllMocks();
});

class SteelDoorQuoteCalculator {
  constructor() {
    this.pricePerSqM = 700; // £700 per square metre
    this.init();
  }

  init() {
    const container = document.querySelector('[data-steel-door-calculator]');
    if (!container) return;

    this.container = container;
    this.buttonUrl = container.getAttribute('data-button-url');
    this.heightInput = container.querySelector('[data-height-input]');
    this.widthInput = container.querySelector('[data-width-input]');
    this.resultDisplay = container.querySelector('[data-quote-result]');
    this.priceDisplay = container.querySelector('[data-quote-price]');
    this.areaDisplay = container.querySelector('[data-area-display]');
    this.submitButton = container.querySelector('[data-submit-button]');

    if (this.heightInput && this.widthInput) {
      this.heightInput.addEventListener('input', () => this.calculate());
      this.widthInput.addEventListener('input', () => this.calculate());
      this.submitButton?.addEventListener('click', () => this.submitQuote());
    }
  }

  calculate() {
    const height = parseFloat(this.heightInput.value);
    const width = parseFloat(this.widthInput.value);

    // Clear results if inputs are invalid
    if (!height || !width || height <= 0 || width <= 0) {
      this.priceDisplay.textContent = '';
      this.areaDisplay.textContent = '';
      this.resultDisplay.classList.remove('show');
      return;
    }

    // Calculate area in square metres
    const area = height * width;
    
    // Calculate total cost
    const totalCost = area * this.pricePerSqM;

    // Display results
    this.areaDisplay.textContent = `Area: ${area.toFixed(2)} m²`;
    this.priceDisplay.textContent = `£${totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    this.resultDisplay.classList.add('show');

    // Store values for potential submission
    this.lastArea = area;
    this.lastCost = totalCost;
  }

  submitQuote() {
    if (!this.lastCost) {
      alert('Please enter valid dimensions first');
      return;
    }

    const height = parseFloat(this.heightInput.value);
    const width = parseFloat(this.widthInput.value);
    const area = this.lastArea;
    const cost = this.lastCost;

    // Create quote object
    const quote = {
      height: height,
      width: width,
      area: area,
      costPerM2: this.pricePerSqM,
      totalCost: cost,
      timestamp: new Date().toISOString()
    };

    // Store in localStorage
    localStorage.setItem('steelDoorQuote', JSON.stringify(quote));

    // Trigger custom event for further processing
    document.dispatchEvent(new CustomEvent('steelDoorQuoteSubmitted', { detail: quote }));

    // Redirect if URL is set
    if (this.buttonUrl) {
      window.location.href = this.buttonUrl;
    } else {
      // Show confirmation only if no redirect URL
      this.showConfirmation();
    }
  }

  showConfirmation() {
    const button = this.submitButton;
    const originalText = button.textContent;
    
    button.textContent = '✓ Quote submitted';
    button.disabled = true;
    button.classList.add('submitted');

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      button.classList.remove('submitted');
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SteelDoorQuoteCalculator();
  });
} else {
  new SteelDoorQuoteCalculator();
}
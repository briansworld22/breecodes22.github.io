// ===== FSBO Transaction Manager Application =====

// Application State
let appState = {
    currentView: 'welcome',
    transaction: null,
    milestones: [],
    documents: []
};

// ===== DC-Specific Timeline Templates =====
const TIMELINE_TEMPLATES = {
    buyer: [
        {
            id: 'offer',
            title: 'Submit Offer & Earnest Money',
            description: 'Submit your offer to the seller and deposit earnest money',
            daysFromStart: 0,
            duration: 3,
            dependencies: [],
            status: 'not-started'
        },
        {
            id: 'inspection',
            title: 'Home Inspection Period',
            description: 'Conduct home inspection and negotiate repairs if needed (typically 5-15 days in DC)',
            daysFromStart: 3,
            duration: 10,
            dependencies: ['offer'],
            status: 'not-started'
        },
        {
            id: 'financing',
            title: 'Secure Financing Commitment',
            description: 'Obtain loan commitment from lender (financing contingency deadline)',
            daysFromStart: 5,
            duration: 21,
            dependencies: ['offer'],
            status: 'not-started'
        },
        {
            id: 'appraisal',
            title: 'Property Appraisal',
            description: 'Lender orders and completes property appraisal',
            daysFromStart: 10,
            duration: 14,
            dependencies: ['financing'],
            status: 'not-started'
        },
        {
            id: 'title-review',
            title: 'Review Title Commitment',
            description: 'Review title insurance commitment and address any title issues',
            daysFromStart: 15,
            duration: 10,
            dependencies: ['offer'],
            status: 'not-started'
        },
        {
            id: 'hoa-review',
            title: 'Review HOA Documents',
            description: 'Review HOA documents if applicable (CCRs, financials, meeting minutes)',
            daysFromStart: 10,
            duration: 7,
            dependencies: ['offer'],
            status: 'not-started'
        },
        {
            id: 'final-walkthrough',
            title: 'Final Walkthrough',
            description: 'Conduct final walkthrough of property before settlement',
            daysFromStart: -2,
            duration: 1,
            dependencies: ['inspection', 'appraisal'],
            status: 'not-started'
        },
        {
            id: 'settlement',
            title: 'Settlement Day',
            description: 'Sign all documents, transfer funds, and receive keys',
            daysFromStart: 0,
            duration: 1,
            dependencies: ['final-walkthrough', 'financing', 'title-review'],
            status: 'not-started',
            isSettlement: true
        }
    ],
    seller: [
        {
            id: 'pre-listing',
            title: 'Pre-Listing Preparation',
            description: 'Gather required disclosures, property documents, and prepare home for showing',
            daysFromStart: 0,
            duration: 7,
            dependencies: [],
            status: 'not-started'
        },
        {
            id: 'receive-offer',
            title: 'Review & Accept Offer',
            description: 'Review buyer offers and negotiate terms',
            daysFromStart: 7,
            duration: 5,
            dependencies: ['pre-listing'],
            status: 'not-started'
        },
        {
            id: 'inspection-period',
            title: 'Buyer Inspection Period',
            description: 'Allow buyer to conduct inspections and negotiate any repairs',
            daysFromStart: 12,
            duration: 10,
            dependencies: ['receive-offer'],
            status: 'not-started'
        },
        {
            id: 'hoa-docs',
            title: 'Deliver HOA Documents',
            description: 'Provide HOA package to buyer if applicable (must be delivered within required timeframe)',
            daysFromStart: 14,
            duration: 7,
            dependencies: ['receive-offer'],
            status: 'not-started'
        },
        {
            id: 'appraisal-coord',
            title: 'Coordinate Appraisal',
            description: 'Provide access for lender appraisal',
            daysFromStart: 17,
            duration: 7,
            dependencies: ['receive-offer'],
            status: 'not-started'
        },
        {
            id: 'title-clear',
            title: 'Clear Title Issues',
            description: 'Address any title defects or liens discovered',
            daysFromStart: 20,
            duration: 14,
            dependencies: ['receive-offer'],
            status: 'not-started'
        },
        {
            id: 'settlement-prep',
            title: 'Settlement Preparation',
            description: 'Review settlement statement, prepare for final transfer',
            daysFromStart: -3,
            duration: 3,
            dependencies: ['inspection-period', 'title-clear'],
            status: 'not-started'
        },
        {
            id: 'settlement',
            title: 'Settlement Day',
            description: 'Sign documents, receive proceeds, transfer ownership',
            daysFromStart: 0,
            duration: 1,
            dependencies: ['settlement-prep'],
            status: 'not-started',
            isSettlement: true
        }
    ]
};

// ===== DC-Specific Document Templates =====
const DOCUMENT_TEMPLATES = {
    buyer: {
        'Required DC Forms': [
            {
                id: 'purchase-agreement',
                name: 'DC Residential Purchase Agreement',
                description: 'Main contract for property purchase',
                required: true,
                dcLink: 'https://otr.cfo.dc.gov/',
                status: 'incomplete'
            },
            {
                id: 'lead-paint',
                name: 'Lead-Based Paint Disclosure',
                description: 'Required for properties built before 1978',
                required: 'conditional',
                dcLink: 'https://dcra.dc.gov/',
                status: 'incomplete'
            }
        ],
        'Financial Documents': [
            {
                id: 'preapproval',
                name: 'Mortgage Pre-Approval Letter',
                description: 'Proof of financing from lender',
                required: true,
                status: 'incomplete'
            },
            {
                id: 'earnest-money',
                name: 'Earnest Money Deposit Receipt',
                description: 'Proof of good faith deposit',
                required: true,
                status: 'incomplete'
            },
            {
                id: 'loan-commitment',
                name: 'Loan Commitment Letter',
                description: 'Final loan approval from lender',
                required: true,
                status: 'incomplete'
            }
        ],
        'Inspection & Due Diligence': [
            {
                id: 'home-inspection',
                name: 'Home Inspection Report',
                description: 'Professional inspection of property condition',
                required: false,
                status: 'incomplete'
            },
            {
                id: 'appraisal',
                name: 'Property Appraisal',
                description: 'Lender-ordered property valuation',
                required: true,
                status: 'incomplete'
            },
            {
                id: 'hoa-docs',
                name: 'HOA Documents Package',
                description: 'CCRs, financials, meeting minutes (if applicable)',
                required: 'conditional',
                status: 'incomplete'
            }
        ],
        'Title & Settlement': [
            {
                id: 'title-commitment',
                name: 'Title Insurance Commitment',
                description: 'Title company commitment to insure',
                required: true,
                status: 'incomplete'
            },
            {
                id: 'settlement-statement',
                name: 'Settlement Statement (HUD-1/CD)',
                description: 'Final accounting of all transaction costs',
                required: true,
                status: 'incomplete'
            },
            {
                id: 'homeowners-insurance',
                name: 'Homeowners Insurance Policy',
                description: 'Required before settlement',
                required: true,
                status: 'incomplete'
            }
        ]
    },
    seller: {
        'Required DC Disclosures': [
            {
                id: 'property-disclosure',
                name: 'DC Residential Property Disclosure Statement',
                description: 'Required disclosure of property condition and defects',
                required: true,
                dcLink: 'https://dcra.dc.gov/',
                status: 'incomplete'
            },
            {
                id: 'lead-paint',
                name: 'Lead-Based Paint Disclosure',
                description: 'Required for properties built before 1978',
                required: 'conditional',
                dcLink: 'https://dcra.dc.gov/',
                status: 'incomplete'
            }
        ],
        'Property Documents': [
            {
                id: 'property-tax',
                name: 'Current Property Tax Records',
                description: 'Recent tax bills and assessment information',
                required: true,
                dcLink: 'https://otr.cfo.dc.gov/',
                status: 'incomplete'
            },
            {
                id: 'existing-survey',
                name: 'Property Survey',
                description: 'Existing survey if available',
                required: false,
                status: 'incomplete'
            },
            {
                id: 'warranties',
                name: 'Warranties & Manuals',
                description: 'Appliance warranties, HVAC manuals, etc.',
                required: false,
                status: 'incomplete'
            }
        ],
        'HOA Documents (if applicable)': [
            {
                id: 'hoa-ccrs',
                name: 'HOA CCRs & Bylaws',
                description: 'Governing documents for homeowners association',
                required: 'conditional',
                status: 'incomplete'
            },
            {
                id: 'hoa-financials',
                name: 'HOA Financial Statements',
                description: 'Recent HOA budget and reserves',
                required: 'conditional',
                status: 'incomplete'
            },
            {
                id: 'hoa-minutes',
                name: 'HOA Meeting Minutes',
                description: 'Recent board meeting minutes',
                required: 'conditional',
                status: 'incomplete'
            }
        ],
        'Settlement Documents': [
            {
                id: 'payoff-statement',
                name: 'Mortgage Payoff Statement',
                description: 'Payoff amount from current lender',
                required: true,
                status: 'incomplete'
            },
            {
                id: 'settlement-statement',
                name: 'Settlement Statement Review',
                description: 'Review final settlement statement for accuracy',
                required: true,
                status: 'incomplete'
            }
        ]
    }
};

// ===== DC Tax Calculation Functions =====
const DCTaxCalculator = {
    // DC Recordation Tax on Deed
    calculateDeedRecordationTax(salePrice, isFirstTimeBuyer = false) {
        if (isFirstTimeBuyer && salePrice <= 400000) {
            return 0; // First-time buyer exemption for first $400k
        }

        let tax = 0;
        if (salePrice <= 400000) {
            tax = salePrice * 0.011; // 1.1%
        } else {
            tax = (400000 * 0.011) + ((salePrice - 400000) * 0.0145); // 1.1% + 1.45%
        }
        return tax;
    },

    // DC Recordation Tax on Mortgage
    calculateMortgageRecordationTax(loanAmount) {
        let tax = 0;
        if (loanAmount <= 400000) {
            tax = loanAmount * 0.011; // 1.1%
        } else {
            tax = (400000 * 0.011) + ((loanAmount - 400000) * 0.0145);
        }
        return tax;
    },

    // DC Transfer Tax
    calculateTransferTax(salePrice) {
        // 1.45% for residential properties (typically paid by seller)
        return salePrice * 0.0145;
    },

    // Estimate Title Insurance (owner's policy)
    estimateTitleInsurance(salePrice) {
        // Rough estimate based on DC rates
        if (salePrice <= 100000) return 850;
        if (salePrice <= 200000) return 1100;
        if (salePrice <= 400000) return 1500;
        if (salePrice <= 600000) return 2000;
        if (salePrice <= 1000000) return 2800;
        return 3500;
    },

    // Estimate Lender's Title Insurance
    estimateLenderTitleInsurance(loanAmount) {
        // Typically 20-30% of owner's policy cost
        const ownerEstimate = this.estimateTitleInsurance(loanAmount);
        return ownerEstimate * 0.25;
    }
};

// ===== Data Persistence =====
const Storage = {
    save(transaction) {
        localStorage.setItem('dcFSBOTransaction', JSON.stringify(transaction));
        localStorage.setItem('dcFSBOMilestones', JSON.stringify(appState.milestones));
        localStorage.setItem('dcFSBODocuments', JSON.stringify(appState.documents));
    },

    load() {
        const transaction = localStorage.getItem('dcFSBOTransaction');
        const milestones = localStorage.getItem('dcFSBOMilestones');
        const documents = localStorage.getItem('dcFSBODocuments');

        return {
            transaction: transaction ? JSON.parse(transaction) : null,
            milestones: milestones ? JSON.parse(milestones) : [],
            documents: documents ? JSON.parse(documents) : []
        };
    },

    clear() {
        localStorage.removeItem('dcFSBOTransaction');
        localStorage.removeItem('dcFSBOMilestones');
        localStorage.removeItem('dcFSBODocuments');
    }
};

// ===== Date Utilities =====
const DateUtils = {
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round((date2 - date1) / oneDay);
    },

    isOverdue(date) {
        return new Date(date) < new Date();
    },

    isUpcoming(date, days = 7) {
        const daysUntil = this.daysBetween(new Date(), new Date(date));
        return daysUntil >= 0 && daysUntil <= days;
    }
};

// ===== View Management =====
const ViewManager = {
    show(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show requested view
        const view = document.getElementById(viewName + 'View');
        if (view) {
            view.classList.add('active');
        }

        // Update navigation
        const nav = document.getElementById('mainNav');
        if (viewName === 'welcome' || viewName === 'setup') {
            nav.classList.add('hidden');
        } else {
            nav.classList.remove('hidden');
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });

        appState.currentView = viewName;
    }
};

// ===== Transaction Creation =====
function createTransaction(formData) {
    const settlementDate = new Date(formData.settlementDate);
    const today = new Date();
    const transactionDuration = DateUtils.daysBetween(today, settlementDate);

    const transaction = {
        role: formData.role,
        salePrice: parseFloat(formData.salePrice),
        settlementDate: formData.settlementDate,
        loanType: formData.loanType,
        downPaymentPercent: parseFloat(formData.downPaymentPercent) || 0,
        interestRate: parseFloat(formData.interestRate) || 0,
        propertyYear: formData.propertyYear ? parseInt(formData.propertyYear) : null,
        hasHOA: formData.hasHOA,
        isFirstTimeBuyer: formData.isFirstTimeBuyer,
        createdDate: today.toISOString()
    };

    // Calculate loan amount
    if (transaction.loanType !== 'cash') {
        transaction.loanAmount = transaction.salePrice * (1 - transaction.downPaymentPercent / 100);
        transaction.downPayment = transaction.salePrice - transaction.loanAmount;
    } else {
        transaction.loanAmount = 0;
        transaction.downPayment = transaction.salePrice;
    }

    return transaction;
}

// ===== Timeline Generation =====
function generateTimeline(transaction) {
    const template = TIMELINE_TEMPLATES[transaction.role];
    const settlementDate = new Date(transaction.settlementDate);
    const today = new Date();

    const milestones = template.map(milestone => {
        const clone = { ...milestone };

        // Calculate dates
        if (milestone.isSettlement) {
            clone.dueDate = settlementDate;
        } else if (milestone.daysFromStart < 0) {
            // Negative days means before settlement
            clone.dueDate = DateUtils.addDays(settlementDate, milestone.daysFromStart);
        } else {
            // Positive days means from today
            clone.dueDate = DateUtils.addDays(today, milestone.daysFromStart);
        }

        // Set initial status
        if (DateUtils.isOverdue(clone.dueDate) && clone.status === 'not-started') {
            clone.status = 'at-risk';
        }

        // Skip HOA-related milestones if no HOA
        if (!transaction.hasHOA && (clone.id.includes('hoa') || clone.id === 'hoa-review')) {
            clone.skipped = true;
        }

        clone.notes = '';

        return clone;
    });

    return milestones;
}

// ===== Document Generation =====
function generateDocuments(transaction) {
    const template = DOCUMENT_TEMPLATES[transaction.role];
    const documents = [];

    for (const category in template) {
        template[category].forEach(doc => {
            const clone = { ...doc, category };

            // Handle conditional requirements
            if (clone.required === 'conditional') {
                if (doc.id.includes('hoa') && !transaction.hasHOA) {
                    clone.skipped = true;
                } else if (doc.id === 'lead-paint' && transaction.propertyYear && transaction.propertyYear >= 1978) {
                    clone.skipped = true;
                } else {
                    clone.required = true;
                }
            }

            documents.push(clone);
        });
    }

    return documents;
}

// ===== Dashboard Rendering =====
function renderDashboard() {
    const { transaction } = appState;

    // Role display
    document.getElementById('roleDisplay').textContent =
        transaction.role === 'buyer' ? 'Buyer' : 'Seller';

    // Days remaining
    const daysRemaining = DateUtils.daysBetween(new Date(), new Date(transaction.settlementDate));
    document.getElementById('daysRemaining').textContent = daysRemaining;

    // Milestones progress
    const activeMilestones = appState.milestones.filter(m => !m.skipped);
    const completedMilestones = activeMilestones.filter(m => m.status === 'completed');
    document.getElementById('milestonesProgress').textContent =
        `${completedMilestones.length}/${activeMilestones.length}`;

    // Documents progress
    const activeDocuments = appState.documents.filter(d => !d.skipped);
    const completedDocuments = activeDocuments.filter(d => d.status === 'complete');
    document.getElementById('documentsProgress').textContent =
        `${completedDocuments.length}/${activeDocuments.length}`;

    // Overall status
    const statusEl = document.getElementById('overallStatus');
    const atRiskMilestones = activeMilestones.filter(m => m.status === 'at-risk');
    const overdueMilestones = activeMilestones.filter(m =>
        DateUtils.isOverdue(m.dueDate) && m.status !== 'completed'
    );

    if (overdueMilestones.length > 0) {
        statusEl.textContent = 'Overdue';
        statusEl.className = 'progress-value status overdue';
    } else if (atRiskMilestones.length > 0) {
        statusEl.textContent = 'At Risk';
        statusEl.className = 'progress-value status at-risk';
    } else {
        statusEl.textContent = 'On Track';
        statusEl.className = 'progress-value status on-track';
    }

    // Next actions
    renderNextActions();
}

function renderNextActions() {
    const nextActionsList = document.getElementById('nextActionsList');

    // Get upcoming incomplete milestones
    const upcomingMilestones = appState.milestones
        .filter(m => !m.skipped && m.status !== 'completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

    if (upcomingMilestones.length === 0) {
        nextActionsList.innerHTML = '<div class="action-item"><div class="action-content"><div class="action-title">All caught up! 🎉</div></div></div>';
        return;
    }

    nextActionsList.innerHTML = upcomingMilestones.map(milestone => {
        const daysUntil = DateUtils.daysBetween(new Date(), new Date(milestone.dueDate));
        let priority = 'low';
        if (daysUntil < 0) priority = 'high';
        else if (daysUntil <= 3) priority = 'high';
        else if (daysUntil <= 7) priority = 'medium';

        const dueText = daysUntil < 0
            ? `Overdue by ${Math.abs(daysUntil)} days`
            : daysUntil === 0
            ? 'Due today'
            : `Due in ${daysUntil} days`;

        return `
            <div class="action-item">
                <div class="action-priority ${priority}"></div>
                <div class="action-content">
                    <div class="action-title">${milestone.title}</div>
                    <div class="action-due">${dueText} • ${DateUtils.formatDate(milestone.dueDate)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Timeline Rendering =====
function renderTimeline() {
    const timelineContent = document.getElementById('timelineContent');

    const activeMilestones = appState.milestones.filter(m => !m.skipped);

    timelineContent.innerHTML = activeMilestones.map(milestone => {
        const daysUntil = DateUtils.daysBetween(new Date(), new Date(milestone.dueDate));
        const isOverdue = DateUtils.isOverdue(milestone.dueDate) && milestone.status !== 'completed';

        let statusClass = milestone.status;
        if (isOverdue && milestone.status !== 'completed') {
            statusClass = 'at-risk';
        }

        return `
            <div class="timeline-item ${statusClass}">
                <div class="timeline-marker"></div>
                <div class="timeline-date">${DateUtils.formatDate(milestone.dueDate)} ${daysUntil >= 0 ? `(${daysUntil} days)` : '(overdue)'}</div>
                <div class="timeline-title">${milestone.title}</div>
                <div class="timeline-description">${milestone.description}</div>
                <div class="timeline-status ${milestone.status}">${milestone.status.replace('-', ' ')}</div>
                <div class="timeline-notes">
                    <textarea
                        placeholder="Add notes..."
                        data-milestone-id="${milestone.id}"
                        onchange="updateMilestoneNotes('${milestone.id}', this.value)"
                    >${milestone.notes || ''}</textarea>
                    <button class="btn-secondary" onclick="updateMilestoneStatus('${milestone.id}')">
                        ${milestone.status === 'completed' ? 'Mark Incomplete' : milestone.status === 'in-progress' ? 'Mark Complete' : 'Start'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Documents Rendering =====
function renderDocuments() {
    const documentsContent = document.getElementById('documentsContent');

    // Group documents by category
    const categorizedDocs = {};
    appState.documents.forEach(doc => {
        if (doc.skipped) return;
        if (!categorizedDocs[doc.category]) {
            categorizedDocs[doc.category] = [];
        }
        categorizedDocs[doc.category].push(doc);
    });

    documentsContent.innerHTML = Object.keys(categorizedDocs).map(category => `
        <div class="document-category">
            <h3>${category}</h3>
            ${categorizedDocs[category].map(doc => `
                <div class="document-item">
                    <input
                        type="checkbox"
                        class="document-checkbox"
                        ${doc.status === 'complete' ? 'checked' : ''}
                        onchange="toggleDocumentStatus('${doc.id}')"
                    >
                    <div class="document-info">
                        <div class="document-name">${doc.name}</div>
                        <div class="document-description">${doc.description}</div>
                        ${doc.dcLink ? `<a href="${doc.dcLink}" target="_blank" class="document-link">Official DC Link →</a>` : ''}
                    </div>
                    <div class="document-status ${doc.status}">
                        ${doc.status === 'complete' ? 'Complete' : 'Incomplete'}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ===== Financial Calculations & Rendering =====
function renderFinancials() {
    const { transaction } = appState;
    const financialContent = document.getElementById('financialContent');

    if (transaction.role === 'buyer') {
        renderBuyerFinancials(financialContent, transaction);
    } else {
        renderSellerFinancials(financialContent, transaction);
    }
}

function renderBuyerFinancials(container, transaction) {
    // Calculate all costs
    const deedRecordationTax = DCTaxCalculator.calculateDeedRecordationTax(
        transaction.salePrice,
        transaction.isFirstTimeBuyer
    );
    const mortgageRecordationTax = transaction.loanAmount > 0
        ? DCTaxCalculator.calculateMortgageRecordationTax(transaction.loanAmount)
        : 0;
    const ownerTitleInsurance = DCTaxCalculator.estimateTitleInsurance(transaction.salePrice);
    const lenderTitleInsurance = transaction.loanAmount > 0
        ? DCTaxCalculator.estimateLenderTitleInsurance(transaction.loanAmount)
        : 0;

    // Estimate other costs
    const homeInspection = 500;
    const appraisal = 600;
    const settlementFees = 800;
    const homeownersInsurance = 1500;
    const hoaTransferFee = transaction.hasHOA ? 500 : 0;
    const estimatedPropertyTax = (transaction.salePrice * 0.0085) / 12; // Monthly estimate

    // Loan costs (if applicable)
    const loanOrigination = transaction.loanAmount * 0.01; // 1% estimate
    const loanDiscount = 0; // Points

    const totalClosingCosts =
        deedRecordationTax +
        mortgageRecordationTax +
        ownerTitleInsurance +
        lenderTitleInsurance +
        homeInspection +
        appraisal +
        settlementFees +
        homeownersInsurance +
        hoaTransferFee +
        loanOrigination +
        loanDiscount;

    const cashToClose = transaction.downPayment + totalClosingCosts;

    // Monthly payment (PITI)
    let monthlyPayment = 0;
    let principalAndInterest = 0;
    if (transaction.loanAmount > 0) {
        const monthlyRate = transaction.interestRate / 100 / 12;
        const numPayments = 30 * 12; // 30-year mortgage
        principalAndInterest = transaction.loanAmount *
            (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);
        monthlyPayment = principalAndInterest + estimatedPropertyTax + (homeownersInsurance / 12);
    }

    // First payment date (1st of month following 30 days post-close)
    const settlementDate = new Date(transaction.settlementDate);
    const firstPaymentDate = new Date(settlementDate);
    firstPaymentDate.setDate(1);
    firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 2);

    container.innerHTML = `
        <div class="financial-section">
            <h2>Cash Required at Closing</h2>
            <div class="financial-row">
                <div class="financial-label">Down Payment</div>
                <div class="financial-value">$${transaction.downPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Total Closing Costs</div>
                <div class="financial-value">$${totalClosingCosts.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row total">
                <div class="financial-label">Total Cash to Close</div>
                <div class="financial-value">$${cashToClose.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
        </div>

        <div class="financial-section">
            <h2>Closing Cost Breakdown</h2>
            <div class="financial-row">
                <div class="financial-label">Home Inspection</div>
                <div class="financial-value">$${homeInspection.toLocaleString('en-US')}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Appraisal Fee</div>
                <div class="financial-value">$${appraisal.toLocaleString('en-US')}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Deed Recordation Tax (DC)</div>
                <div class="financial-value">$${deedRecordationTax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            ${mortgageRecordationTax > 0 ? `
            <div class="financial-row">
                <div class="financial-label">Mortgage Recordation Tax (DC)</div>
                <div class="financial-value">$${mortgageRecordationTax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            ` : ''}
            <div class="financial-row">
                <div class="financial-label">Owner's Title Insurance</div>
                <div class="financial-value">$${ownerTitleInsurance.toLocaleString('en-US')}</div>
            </div>
            ${lenderTitleInsurance > 0 ? `
            <div class="financial-row">
                <div class="financial-label">Lender's Title Insurance</div>
                <div class="financial-value">$${lenderTitleInsurance.toLocaleString('en-US')}</div>
            </div>
            ` : ''}
            <div class="financial-row">
                <div class="financial-label">Settlement/Escrow Fees</div>
                <div class="financial-value">$${settlementFees.toLocaleString('en-US')}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">First Year Homeowners Insurance</div>
                <div class="financial-value">$${homeownersInsurance.toLocaleString('en-US')}</div>
            </div>
            ${hoaTransferFee > 0 ? `
            <div class="financial-row">
                <div class="financial-label">HOA Transfer Fee</div>
                <div class="financial-value">$${hoaTransferFee.toLocaleString('en-US')}</div>
            </div>
            ` : ''}
            ${loanOrigination > 0 ? `
            <div class="financial-row">
                <div class="financial-label">Loan Origination Fee (1%)</div>
                <div class="financial-value">$${loanOrigination.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            ` : ''}

            <div class="dc-tax-info">
                <h4>DC Tax Information</h4>
                <ul>
                    <li><strong>Deed Recordation Tax:</strong> 1.1% for first $400k, 1.45% above ${transaction.isFirstTimeBuyer ? '(First-time buyer exemption applied!)' : ''}</li>
                    <li><strong>Mortgage Recordation Tax:</strong> 1.1% for first $400k, 1.45% above</li>
                    <li>Taxes split negotiable; typically buyer pays mortgage tax, deed tax split 50/50</li>
                </ul>
            </div>
        </div>

        ${transaction.loanAmount > 0 ? `
        <div class="financial-section">
            <h2>Monthly Payment (PITI)</h2>
            <div class="financial-row">
                <div class="financial-label">Principal & Interest</div>
                <div class="financial-value">$${principalAndInterest.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Property Tax (est.)</div>
                <div class="financial-value">$${estimatedPropertyTax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Homeowners Insurance</div>
                <div class="financial-value">$${(homeownersInsurance / 12).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row total">
                <div class="financial-label">Total Monthly Payment</div>
                <div class="financial-value">$${monthlyPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-note">
                First mortgage payment due: ${DateUtils.formatDate(firstPaymentDate)}
            </div>
        </div>
        ` : ''}

        <div class="financial-section">
            <h2>Loan Details</h2>
            <div class="financial-row">
                <div class="financial-label">Sale Price</div>
                <div class="financial-value">$${transaction.salePrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Loan Amount (${transaction.loanType})</div>
                <div class="financial-value">$${transaction.loanAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Down Payment (${transaction.downPaymentPercent}%)</div>
                <div class="financial-value">$${transaction.downPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            ${transaction.interestRate > 0 ? `
            <div class="financial-row">
                <div class="financial-label">Interest Rate</div>
                <div class="financial-value">${transaction.interestRate}%</div>
            </div>
            ` : ''}
        </div>
    `;
}

function renderSellerFinancials(container, transaction) {
    // Calculate seller costs
    const transferTax = DCTaxCalculator.calculateTransferTax(transaction.salePrice);
    const deedRecordationTax = DCTaxCalculator.calculateDeedRecordationTax(transaction.salePrice) / 2; // Assume 50/50 split

    // Estimate other costs
    const settlementFees = 500;
    const hoaFees = transaction.hasHOA ? 300 : 0;
    const attorneyFees = 0; // Optional

    // Estimated mortgage payoff (user would need to input actual)
    const estimatedMortgagePayoff = transaction.salePrice * 0.7; // Estimate

    const totalCosts = transferTax + deedRecordationTax + settlementFees + hoaFees + attorneyFees;
    const netProceeds = transaction.salePrice - estimatedMortgagePayoff - totalCosts;

    container.innerHTML = `
        <div class="financial-section">
            <h2>Estimated Net Proceeds</h2>
            <div class="financial-row">
                <div class="financial-label">Sale Price</div>
                <div class="financial-value">$${transaction.salePrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Less: Mortgage Payoff (est.)</div>
                <div class="financial-value">-$${estimatedMortgagePayoff.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Less: Closing Costs</div>
                <div class="financial-value">-$${totalCosts.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row total">
                <div class="financial-label">Estimated Net Proceeds</div>
                <div class="financial-value">$${netProceeds.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-note">
                Note: Mortgage payoff is estimated. Request actual payoff statement from your lender.
            </div>
        </div>

        <div class="financial-section">
            <h2>Seller Closing Costs</h2>
            <div class="financial-row">
                <div class="financial-label">DC Transfer Tax (1.45%)</div>
                <div class="financial-value">$${transferTax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Deed Recordation Tax (50% share)</div>
                <div class="financial-value">$${deedRecordationTax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-row">
                <div class="financial-label">Settlement Fees</div>
                <div class="financial-value">$${settlementFees.toLocaleString('en-US')}</div>
            </div>
            ${hoaFees > 0 ? `
            <div class="financial-row">
                <div class="financial-label">HOA Fees & Transfer</div>
                <div class="financial-value">$${hoaFees.toLocaleString('en-US')}</div>
            </div>
            ` : ''}
            <div class="financial-row total">
                <div class="financial-label">Total Closing Costs</div>
                <div class="financial-value">$${totalCosts.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>

            <div class="dc-tax-info">
                <h4>DC Tax Information</h4>
                <ul>
                    <li><strong>Transfer Tax:</strong> 1.45% (typically paid by seller)</li>
                    <li><strong>Deed Recordation Tax:</strong> Split between buyer/seller (shown as 50/50)</li>
                    <li>All taxes based on DC Office of Tax and Revenue rates</li>
                    <li>This is an FSBO transaction - no broker commission!</li>
                </ul>
            </div>
        </div>
    `;
}

// ===== Event Handlers =====
function updateMilestoneStatus(milestoneId) {
    const milestone = appState.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    // Cycle through statuses
    if (milestone.status === 'not-started') {
        milestone.status = 'in-progress';
    } else if (milestone.status === 'in-progress') {
        milestone.status = 'completed';
    } else {
        milestone.status = 'not-started';
    }

    Storage.save(appState.transaction);
    renderTimeline();
    if (appState.currentView === 'dashboard') {
        renderDashboard();
    }
}

function updateMilestoneNotes(milestoneId, notes) {
    const milestone = appState.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    milestone.notes = notes;
    Storage.save(appState.transaction);
}

function toggleDocumentStatus(docId) {
    const doc = appState.documents.find(d => d.id === docId);
    if (!doc) return;

    doc.status = doc.status === 'complete' ? 'incomplete' : 'complete';
    Storage.save(appState.transaction);
    renderDocuments();
    if (appState.currentView === 'dashboard') {
        renderDashboard();
    }
}

// ===== Initialization =====
function init() {
    // Load saved data
    const saved = Storage.load();
    if (saved.transaction) {
        appState.transaction = saved.transaction;
        appState.milestones = saved.milestones;
        appState.documents = saved.documents;

        ViewManager.show('dashboard');
        renderDashboard();
    } else {
        ViewManager.show('welcome');
    }

    // Role selection buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const role = this.dataset.role;
            document.getElementById('transactionForm').dataset.role = role;
            ViewManager.show('setup');
        });
    });

    // Back to role button
    document.getElementById('backToRole').addEventListener('click', () => {
        ViewManager.show('welcome');
    });

    // Loan type change - show/hide loan fields
    document.getElementById('loanType').addEventListener('change', function() {
        const loanFields = document.getElementById('loanFields');
        if (this.value === 'cash') {
            loanFields.classList.add('hidden');
        } else {
            loanFields.classList.remove('hidden');
        }
    });

    // Transaction form submission
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = {
            role: this.dataset.role,
            salePrice: document.getElementById('salePrice').value,
            settlementDate: document.getElementById('settlementDate').value,
            loanType: document.getElementById('loanType').value,
            downPaymentPercent: document.getElementById('downPaymentPercent').value,
            interestRate: document.getElementById('interestRate').value,
            propertyYear: document.getElementById('propertyYear').value,
            hasHOA: document.getElementById('hasHOA').checked,
            isFirstTimeBuyer: document.getElementById('isFirstTimeBuyer').checked
        };

        appState.transaction = createTransaction(formData);
        appState.milestones = generateTimeline(appState.transaction);
        appState.documents = generateDocuments(appState.transaction);

        Storage.save(appState.transaction);

        ViewManager.show('dashboard');
        renderDashboard();
    });

    // Navigation links
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.dataset.view;
            ViewManager.show(view);

            // Render appropriate content
            if (view === 'dashboard') renderDashboard();
            else if (view === 'timeline') renderTimeline();
            else if (view === 'documents') renderDocuments();
            else if (view === 'financial') renderFinancials();
        });
    });

    // Quick links
    document.querySelectorAll('.quick-link-card').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.dataset.view;
            ViewManager.show(view);

            if (view === 'timeline') renderTimeline();
            else if (view === 'documents') renderDocuments();
            else if (view === 'financial') renderFinancials();
        });
    });

    // New transaction button
    document.getElementById('newTransactionBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to start a new transaction? Current data will be lost.')) {
            Storage.clear();
            appState.transaction = null;
            appState.milestones = [];
            appState.documents = [];
            ViewManager.show('welcome');
        }
    });

    // Print buttons
    document.getElementById('printTimeline').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('printDocuments').addEventListener('click', () => {
        window.print();
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', init);

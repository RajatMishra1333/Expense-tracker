const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    max: 999999.99
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other'],
    default: 'other'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to format amount as currency
expenseSchema.methods.getFormattedAmount = function() {
  return `$${this.amount.toFixed(2)}`;
};

// Instance method to get formatted date
expenseSchema.methods.getFormattedDate = function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Instance method to get category display name
expenseSchema.methods.getCategoryDisplay = function() {
  const categoryMap = {
    'food': 'Food & Dining',
    'transport': 'Transportation',
    'entertainment': 'Entertainment',
    'utilities': 'Utilities',
    'healthcare': 'Healthcare',
    'shopping': 'Shopping',
    'other': 'Other'
  };
  return categoryMap[this.category] || 'Other';
};

// Static method to get expenses by user
expenseSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ date: -1 });
};

// Static method to get expenses by category
expenseSchema.statics.findByCategory = function(userId, category) {
  return this.find({ userId, category }).sort({ date: -1 });
};

// Static method to get expenses within date range
expenseSchema.statics.findByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

// Static method to get total expenses by user
expenseSchema.statics.getTotalByUser = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

// Static method to get expenses grouped by category
expenseSchema.statics.getByCategory = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

// Static method to get monthly expenses
expenseSchema.statics.getMonthlyExpenses = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);
};

// Index for better query performance
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
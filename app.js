const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Import models
const User = require('./models/user');
const Expense = require('./models/expense');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected Successfully!'))
.catch((err) => console.error('MongoDB Connection Error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'expense-tracker-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/');
  }
};

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.render('index', { error: null });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect('/dashboard');
    } else {
      res.render('index', { error: 'Invalid email or password' });
    }
  } catch (error) {
    res.render('index', { error: 'Login failed' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('index', { error: 'User already exists' });
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    req.session.userId = user._id;
    res.redirect('/dashboard');
  } catch (error) {
    res.render('index', { error: 'Registration failed' });
  }
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const expenses = await Expense.find({ userId: req.session.userId }).sort({ date: -1 });
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate expenses by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    
    res.render('dashboard', {
      user,
      expenses,
      totalExpenses,
      expensesByCategory
    });
  } catch (error) {
    res.redirect('/');
  }
});

app.get('/add', requireAuth, (req, res) => {
  res.render('add', { error: null });
});

app.post('/add-expense', requireAuth, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    
    const expense = new Expense({
      userId: req.session.userId,
      description,
      amount: parseFloat(amount),
      category,
      date: new Date(date)
    });
    
    await expense.save();
    res.redirect('/dashboard');
  } catch (error) {
    res.render('add', { error: 'Failed to add expense' });
  }
});

app.delete('/expense/:id', requireAuth, async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
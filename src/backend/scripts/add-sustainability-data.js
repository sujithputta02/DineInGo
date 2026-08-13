const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const addSustainabilityData = async () => {
  try {
    console.log('Adding sustainability data to existing restaurants...');
    
    // Get the Restaurant model
    const Restaurant = mongoose.model('Restaurant');
    
    // Update all restaurants that don't have sustainability data
    const result = await Restaurant.updateMany(
      { sustainability: { $exists: false } },
      {
        $set: {
          sustainability: {
            score: Math.floor(Math.random() * 6) + 5, // Random score between 5-10
            localIngredients: Math.floor(Math.random() * 51) + 50, // Random between 50-100%
            carbonFootprint: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
          }
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} restaurants with sustainability data`);
    
    // Also update restaurants that have null or empty sustainability
    const result2 = await Restaurant.updateMany(
      { $or: [{ sustainability: null }, { sustainability: {} }] },
      {
        $set: {
          sustainability: {
            score: Math.floor(Math.random() * 6) + 5,
            localIngredients: Math.floor(Math.random() * 51) + 50,
            carbonFootprint: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
          }
        }
      }
    );
    
    console.log(`Updated ${result2.modifiedCount} additional restaurants`);
    console.log('Sustainability data added successfully!');
    
  } catch (error) {
    console.error('Error adding sustainability data:', error);
  } finally {
    mongoose.connection.close();
  }
};

addSustainabilityData();
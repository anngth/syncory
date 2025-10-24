// MongoDB initialization script
db = db.getSiblingDB('syncory');

// Create collections
db.createCollection('users');
db.createCollection('workspaces');
db.createCollection('channels');
db.createCollection('messages');

// Create indexes for users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ workspaces: 1 });

// Create indexes for workspaces
db.workspaces.createIndex({ slug: 1 }, { unique: true });
db.workspaces.createIndex({ ownerId: 1 });
db.workspaces.createIndex({ 'members.userId': 1 });

// Create indexes for channels
db.channels.createIndex({ workspaceId: 1 });
db.channels.createIndex({ type: 1 });
db.channels.createIndex({ 'members.userId': 1 });
db.channels.createIndex({ workspaceId: 1, name: 1 }, { unique: true });

// Create indexes for messages
db.messages.createIndex({ channelId: 1, createdAt: -1 });
db.messages.createIndex({ workspaceId: 1 });
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ parentId: 1 });
db.messages.createIndex({ content: 'text' }); // Full-text search

print('MongoDB initialization completed successfully');

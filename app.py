from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import text
from sqlalchemy.orm import joinedload
import os
import datetime

# ─── App Setup ────────────────────────────────────────────────────────────────
app = Flask(
    __name__,
    static_folder='.',     
    static_url_path=''
)
CORS(app)

# ─── Database Config ─────────────────────────────────────────────────────────
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:rah%407890@localhost:3306/DBSproject'
app.config['SQLALCHEMY_ECHO'] = True               
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ─── Models ───────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(50), unique=True, nullable=False)
    email         = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.Enum('owner','tenant'), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Listing(db.Model):
    __tablename__ = 'listings'
    id          = db.Column(db.Integer, primary_key=True)
    owner_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title       = db.Column(db.String(255), nullable=False)
    address     = db.Column(db.String(255), nullable=False)
    zipcode     = db.Column(db.String(20), nullable=False)
    price       = db.Column(db.Numeric(10,2), nullable=False)
    bedrooms    = db.Column(db.Integer)
    bathrooms   = db.Column(db.Integer)
    description = db.Column(db.Text)
    created_at  = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Inquiry(db.Model):
    __tablename__ = 'inquiries'
    id         = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('listings.id', ondelete='CASCADE'), nullable=False)
    tenant_id  = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message    = db.Column(db.Text)
    status     = db.Column(db.Enum('new','viewed','responded'), default='new')
    sent_at    = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    tenant     = db.relationship('User', backref='inquiries', foreign_keys=[tenant_id])

class Viewing(db.Model):
    __tablename__ = 'viewings'
    id           = db.Column(db.Integer, primary_key=True)
    listing_id   = db.Column(db.Integer, db.ForeignKey('listings.id', ondelete='CASCADE'), nullable=False)
    tenant_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    scheduled_at = db.Column(db.DateTime, nullable=False)
    status       = db.Column(db.Enum('scheduled','completed','cancelled'), default='scheduled')
    created_at   = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.route('/api/pingdb')
def pingdb():
    try:
        db.session.execute(text('SELECT 1'))
        return jsonify({'status':'OK','msg':'DB connection working'})
    except Exception as e:
        return jsonify({'status':'ERROR','msg':str(e)}), 500

# ─── Auth Endpoints ───────────────────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter((User.username==data['username']) | (User.email==data['email'])).first():
        return jsonify({'msg':'Username or email already exists'}), 400

    user = User(
        username      = data['username'],
        email         = data['email'],
        password_hash = generate_password_hash(data['password'], method='pbkdf2:sha256',    # ← explicit method
        salt_length=8 ),
        role          = data['role']
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'msg':'Registration successful'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username'], role=data['role']).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'message':'Invalid credentials'}), 401

    return jsonify({
        'user': {'id': user.id, 'username': user.username, 'role': user.role}
    }), 200

# ─── Listings CRUD ────────────────────────────────────────────────────────────
@app.route('/api/listings', methods=['GET','POST'])
def listings():
    if request.method == 'GET':
        all_list = Listing.query.all()
        return jsonify([{
            'id': l.id, 'owner_id': l.owner_id, 'title': l.title,
            'address': l.address, 'zipcode': l.zipcode,  
            'price': str(l.price),
            'bedrooms': l.bedrooms, 'bathrooms': l.bathrooms,
            'description': l.description
        } for l in all_list]), 200

    data = request.get_json()
    new = Listing(**data)
    db.session.add(new)
    db.session.commit()
    return jsonify({'id': new.id}), 201

@app.route('/api/listings/<int:id>', methods=['PUT','DELETE'])
def modify_listing(id):
    l = Listing.query.get_or_404(id)
    if request.method == 'PUT':
        data = request.get_json()
        for f in ['title','address','zipcode','price','bedrooms','bathrooms','description']:
            if f in data:
                setattr(l, f, data[f])
        db.session.commit()
        return jsonify({'msg':'Updated'}), 200

    db.session.delete(l)
    db.session.commit()
    return jsonify({'msg':'Deleted'}), 200

# ─── Inquiries & Viewings ─────────────────────────────────────────────────────
@app.route('/api/inquiries', methods=['GET','POST'])
def inquiries():
    if request.method == 'GET':
        # eager‑load the tenant relationship in one SQL statement
        iq = Inquiry.query.options(joinedload(Inquiry.tenant)).all()

        return jsonify([{
            'id':          i.id,
            'listing_id':  i.listing_id,
            'tenant_id':   i.tenant_id,
            'tenant_name': i.tenant.username,
            'message':     i.message,
            'status':      i.status,
            'sent_at':     i.sent_at.isoformat()
        } for i in iq]), 200

    data = request.get_json()
    new = Inquiry(**data)
    db.session.add(new)
    db.session.commit()
    return jsonify({'id': new.id}), 201

@app.route('/api/inquiries/<int:id>', methods=['DELETE'])
def delete_inquiry(id):
    inquiry = Inquiry.query.get_or_404(id)
    db.session.delete(inquiry)
    db.session.commit()
    return jsonify({'msg':'Deleted'}), 200

@app.route('/api/viewings', methods=['GET','POST'])
def viewings():
    if request.method == 'GET':
        vs = Viewing.query.all()
        return jsonify([{
            'id': v.id, 'listing_id': v.listing_id,
            'tenant_id': v.tenant_id,
            'scheduled_at': v.scheduled_at.isoformat(),
            'status': v.status
        } for v in vs]), 200

    data = request.get_json()
    data['scheduled_at'] = datetime.datetime.fromisoformat(data['scheduled_at'])
    new = Viewing(**data)
    db.session.add(new)
    db.session.commit()
    return jsonify({'id': new.id}), 201

# ─── Static File Serving ───────────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

# ─── Run App ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)
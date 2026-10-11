"""Expense Tracker API - one AWS Lambda function behind API Gateway (HTTP API).

Routes (defined explicitly in Terraform):
  GET    /expenses              list (newest first), optional ?category=Food
  POST   /expenses              create
  GET    /expenses/summary      total per category + grand total
  GET    /expenses/{id}         one expense
  PUT    /expenses/{id}         update (any of the fields)
  DELETE /expenses/{id}         delete
"""
import json
import os
import traceback
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import DESCENDING, MongoClient

# Created once per Lambda container (not on every request) -> faster
client = MongoClient(os.environ["MONGO_URI"])
collection = client["expense_tracker_db"]["expenses"]

CATEGORIES = ["Food", "Travel", "Bills", "Shopping", "Other"]


# ---------- helpers ----------

def response(status, body=None):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body) if body is not None else "",
    }


def to_json(doc):
    """MongoDB's _id is an ObjectId -> turn it into a string for JSON."""
    doc["_id"] = str(doc["_id"])
    return doc


def parse_id(raw):
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        return None


def validate(data, partial=False):
    """Returns (clean_data, error_message). partial=True is used for PUT."""
    clean = {}

    if "title" in data or not partial:
        title = str(data.get("title") or "").strip()
        if not title:
            return None, "title is required"
        clean["title"] = title

    if "amount" in data or not partial:
        amount = data.get("amount")
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount <= 0:
            return None, "amount must be a number greater than 0"
        clean["amount"] = round(float(amount), 2)

    if "category" in data or not partial:
        category = data.get("category")
        if category not in CATEGORIES:
            return None, "category must be one of " + ", ".join(CATEGORIES)
        clean["category"] = category

    if "date" in data or not partial:
        date = data.get("date")
        try:
            datetime.strptime(str(date), "%Y-%m-%d")
        except ValueError:
            return None, "date must be in YYYY-MM-DD format"
        clean["date"] = date

    if partial and not clean:
        return None, "nothing to update"
    return clean, None


# ---------- one function per route ----------

def list_expenses(params):
    query = {}
    category = params.get("category")
    if category:
        if category not in CATEGORIES:
            return response(400, {"error": "category must be one of " + ", ".join(CATEGORIES)})
        query["category"] = category
    expenses = collection.find(query).sort([("date", DESCENDING), ("_id", DESCENDING)])
    return response(200, [to_json(e) for e in expenses])


def create_expense(body):
    clean, error = validate(body)
    if error:
        return response(400, {"error": error})
    result = collection.insert_one(clean)
    clean["_id"] = str(result.inserted_id)
    # structured log line -> used by the CloudWatch metric filter in Tier 4
    print(json.dumps({"event": "expense_created", "amount": clean["amount"], "category": clean["category"]}))
    return response(201, clean)


def summary():
    pipeline = [{"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}]
    result = {row["_id"]: round(row["total"], 2) for row in collection.aggregate(pipeline)}
    result["total"] = round(sum(result.values()), 2)
    return response(200, result)


def get_expense(oid):
    expense = collection.find_one({"_id": oid})
    if not expense:
        return response(404, {"error": "Expense not found"})
    return response(200, to_json(expense))


def update_expense(oid, body):
    clean, error = validate(body, partial=True)
    if error:
        return response(400, {"error": error})
    result = collection.update_one({"_id": oid}, {"$set": clean})
    if result.matched_count == 0:
        return response(404, {"error": "Expense not found"})
    return response(200, to_json(collection.find_one({"_id": oid})))


def delete_expense(oid):
    result = collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return response(404, {"error": "Expense not found"})
    return response(204)


# ---------- entry point ----------

def lambda_handler(event, context):
    # API Gateway HTTP API tells us which route matched, e.g. "GET /expenses/{id}"
    route = event.get("routeKey", "")
    params = event.get("queryStringParameters") or {}
    raw_id = (event.get("pathParameters") or {}).get("id")

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError:
            return response(400, {"error": "Body must be valid JSON"})
        if not isinstance(body, dict):
            return response(400, {"error": "Body must be a JSON object"})

    try:
        if route == "GET /expenses":
            return list_expenses(params)
        if route == "POST /expenses":
            return create_expense(body)
        if route == "GET /expenses/summary":
            return summary()

        if route in ("GET /expenses/{id}", "PUT /expenses/{id}", "DELETE /expenses/{id}"):
            oid = parse_id(raw_id)
            if oid is None:
                return response(400, {"error": "Invalid expense id"})
            if route.startswith("GET"):
                return get_expense(oid)
            if route.startswith("PUT"):
                return update_expense(oid, body)
            return delete_expense(oid)

        return response(404, {"error": "Route not found"})

    except Exception:
        traceback.print_exc()   # full error goes to CloudWatch Logs
        return response(500, {"error": "Internal server error"})
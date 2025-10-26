#!/usr/bin/env python3
"""
Security and Integration Audit Script
Tests all API endpoints, checks security, CORS, and frontend integration
"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Any
from datetime import datetime

# Audit configuration
BASE_URL = "http://localhost:8000"
API_KEY = "test-key-12345"  # Will test both with and without

class SecurityAudit:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "warnings": 0,
            "critical": 0,
            "issues": []
        }

    def log_issue(self, severity: str, category: str, endpoint: str, description: str, recommendation: str = ""):
        """Log a security or integration issue"""
        issue = {
            "severity": severity,  # CRITICAL, HIGH, MEDIUM, LOW, INFO
            "category": category,  # SECURITY, CORS, VALIDATION, INTEGRATION
            "endpoint": endpoint,
            "description": description,
            "recommendation": recommendation
        }
        self.results["issues"].append(issue)

        if severity == "CRITICAL":
            self.results["critical"] += 1
        elif severity in ["HIGH", "MEDIUM"]:
            self.results["warnings"] += 1

    async def test_endpoint(self, session: aiohttp.ClientSession, method: str,
                           endpoint: str, data: Dict = None,
                           with_auth: bool = True) -> Dict[str, Any]:
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        headers = {}

        if with_auth:
            headers["X-API-Key"] = API_KEY

        try:
            if method == "GET":
                async with session.get(url, headers=headers) as resp:
                    return {
                        "status": resp.status,
                        "data": await resp.json() if resp.content_type == "application/json" else await resp.text()
                    }
            elif method == "POST":
                async with session.post(url, headers=headers, json=data) as resp:
                    return {
                        "status": resp.status,
                        "data": await resp.json() if resp.content_type == "application/json" else await resp.text()
                    }
        except Exception as e:
            return {"status": 0, "error": str(e)}

    async def audit_ai_analysis_endpoints(self, session: aiohttp.ClientSession):
        """Audit AI Analysis endpoints"""
        print("\n🔍 Auditing AI Analysis Endpoints...")

        # Test stock analysis endpoint
        endpoints_to_test = [
            ("POST", "/api/v2/stocks/AAPL.US/ai-analysis", {"deep_research": False}),
            ("POST", "/api/v2/stocks/AAPL.US/ai-analysis?deep_research=true", None),
            ("GET", "/api/v2/stocks/AAPL.US/ai-analysis/history", None),
            ("POST", "/api/v2/currencies/EUR-USD/ai-analysis", None),
            ("POST", "/api/v2/etfs/SPY.US/ai-analysis", None),
            ("POST", "/api/v2/macro/GDP/ai-analysis", None),
            ("POST", "/api/v2/portfolios/1/ai-analysis", None),
        ]

        for method, endpoint, data in endpoints_to_test:
            self.results["total_tests"] += 1

            # Test without authentication (should fail in production)
            result_no_auth = await self.test_endpoint(session, method, endpoint, data, with_auth=False)

            # Test with authentication
            result_with_auth = await self.test_endpoint(session, method, endpoint, data, with_auth=True)

            # Check authentication
            if result_no_auth["status"] == 200:
                self.log_issue(
                    "CRITICAL",
                    "SECURITY",
                    endpoint,
                    "Endpoint accessible without authentication in production mode",
                    "Ensure APP_API_KEY is set and verify_api_key dependency is applied"
                )
                self.results["failed"] += 1
            else:
                self.results["passed"] += 1

            print(f"  ✓ {method} {endpoint}: Auth check {'✓' if result_no_auth['status'] != 200 else '✗'}")

    async def audit_input_validation(self, session: aiohttp.ClientSession):
        """Test input validation and injection attacks"""
        print("\n🔍 Auditing Input Validation...")

        # SQL Injection attempts
        sql_payloads = [
            "'; DROP TABLE stocks; --",
            "AAPL' OR '1'='1",
            "<script>alert('xss')</script>",
            "../../etc/passwd",
            "AAPL%00.US"
        ]

        for payload in sql_payloads:
            self.results["total_tests"] += 1
            result = await self.test_endpoint(
                session, "POST",
                f"/api/v2/stocks/{payload}/ai-analysis",
                with_auth=True
            )

            if result["status"] == 500 and "sql" in str(result.get("data", "")).lower():
                self.log_issue(
                    "CRITICAL",
                    "SECURITY",
                    "/api/v2/stocks/{ticker}/ai-analysis",
                    f"Possible SQL injection vulnerability with payload: {payload}",
                    "Use parameterized queries and input sanitization"
                )
                self.results["failed"] += 1
            elif result["status"] == 200:
                self.log_issue(
                    "HIGH",
                    "VALIDATION",
                    "/api/v2/stocks/{ticker}/ai-analysis",
                    f"Endpoint accepted malicious input: {payload}",
                    "Add input validation to reject invalid ticker formats"
                )
                self.results["failed"] += 1
            else:
                self.results["passed"] += 1

        print(f"  ✓ SQL Injection tests: {len(sql_payloads)} payloads tested")

    async def audit_cors(self, session: aiohttp.ClientSession):
        """Check CORS configuration"""
        print("\n🔍 Auditing CORS Configuration...")

        self.results["total_tests"] += 1

        # Test CORS headers
        url = f"{BASE_URL}/"
        headers = {"Origin": "http://malicious-site.com"}

        try:
            async with session.get(url, headers=headers) as resp:
                cors_header = resp.headers.get("Access-Control-Allow-Origin")

                if cors_header == "*":
                    self.log_issue(
                        "HIGH",
                        "CORS",
                        "Global",
                        "CORS allows all origins (*), which may expose API to CSRF attacks",
                        "Restrict allowed origins to specific trusted domains in production"
                    )
                    self.results["failed"] += 1
                elif cors_header and "malicious-site.com" in cors_header:
                    self.log_issue(
                        "CRITICAL",
                        "CORS",
                        "Global",
                        "CORS allows malicious origins",
                        "Fix ALLOWED_ORIGINS environment variable"
                    )
                    self.results["failed"] += 1
                else:
                    self.results["passed"] += 1
                    print(f"  ✓ CORS configuration: {cors_header or 'Properly restricted'}")
        except Exception as e:
            print(f"  ✗ CORS test failed: {e}")
            self.results["failed"] += 1

    async def audit_rate_limiting(self, session: aiohttp.ClientSession):
        """Test rate limiting"""
        print("\n🔍 Auditing Rate Limiting...")

        # Test multiple rapid requests
        endpoint = "/api/v2/stocks/AAPL.US/ai-analysis"
        requests_to_test = 10

        tasks = []
        for _ in range(requests_to_test):
            tasks.append(self.test_endpoint(session, "POST", endpoint, with_auth=True))

        results = await asyncio.gather(*tasks)

        # Check if any were rate limited (429)
        rate_limited = sum(1 for r in results if r.get("status") == 429)

        self.results["total_tests"] += 1

        if rate_limited == 0:
            self.log_issue(
                "MEDIUM",
                "SECURITY",
                endpoint,
                f"No rate limiting detected after {requests_to_test} rapid requests",
                "Implement rate limiting to prevent API abuse and DoS attacks"
            )
            self.results["warnings"] += 1
        else:
            self.results["passed"] += 1
            print(f"  ✓ Rate limiting: {rate_limited}/{requests_to_test} requests blocked")

    def check_frontend_integration(self):
        """Check if all backend endpoints are consumed by frontend"""
        print("\n🔍 Checking Frontend Integration...")

        # Backend endpoints
        backend_endpoints = {
            "/api/v2/stocks/{ticker}/ai-analysis": False,
            "/api/v2/stocks/{ticker}/ai-analysis/history": False,
            "/api/v2/currencies/{pair}/ai-analysis": False,
            "/api/v2/etfs/{symbol}/ai-analysis": False,
            "/api/v2/macro/{indicator}/ai-analysis": False,
            "/api/v2/portfolios/{id}/ai-analysis": False,
            "/api/v2/ws/agent-console": False,
        }

        # Check api.ts file for these endpoints
        try:
            with open("/home/user/chat-with-fundamentals/frontend/lib/api.ts", "r") as f:
                api_content = f.read()

                for endpoint in backend_endpoints.keys():
                    # Simplified check - look for key parts of the endpoint
                    endpoint_key = endpoint.split("/")[-1].split("{")[0]
                    if endpoint_key in api_content or endpoint.replace("{ticker}", "").replace("{pair}", "").replace("{symbol}", "").replace("{indicator}", "").replace("{id}", "") in api_content:
                        backend_endpoints[endpoint] = True

        except FileNotFoundError:
            print("  ✗ api.ts not found")

        unused_endpoints = [ep for ep, used in backend_endpoints.items() if not used]

        if unused_endpoints:
            for endpoint in unused_endpoints:
                self.log_issue(
                    "LOW",
                    "INTEGRATION",
                    endpoint,
                    "Backend endpoint not consumed by frontend",
                    "Add corresponding API call in frontend/lib/api.ts"
                )

        self.results["total_tests"] += len(backend_endpoints)
        self.results["passed"] += len(backend_endpoints) - len(unused_endpoints)
        self.results["failed"] += len(unused_endpoints)

        print(f"  ✓ Frontend integration: {len(backend_endpoints) - len(unused_endpoints)}/{len(backend_endpoints)} endpoints connected")

    def generate_report(self) -> str:
        """Generate comprehensive audit report"""
        report = []
        report.append("\n" + "=" * 80)
        report.append("SECURITY AND INTEGRATION AUDIT REPORT")
        report.append("=" * 80)
        report.append(f"Timestamp: {self.results['timestamp']}")
        report.append(f"Total Tests: {self.results['total_tests']}")
        report.append(f"Passed: {self.results['passed']} ✓")
        report.append(f"Failed: {self.results['failed']} ✗")
        report.append(f"Warnings: {self.results['warnings']} ⚠️")
        report.append(f"Critical Issues: {self.results['critical']} 🚨")
        report.append("")

        if self.results["issues"]:
            report.append("\n" + "-" * 80)
            report.append("ISSUES FOUND")
            report.append("-" * 80)

            # Group by severity
            for severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
                issues = [i for i in self.results["issues"] if i["severity"] == severity]
                if issues:
                    report.append(f"\n{severity} SEVERITY ({len(issues)} issues):")
                    for idx, issue in enumerate(issues, 1):
                        report.append(f"\n  {idx}. [{issue['category']}] {issue['endpoint']}")
                        report.append(f"     Description: {issue['description']}")
                        if issue['recommendation']:
                            report.append(f"     Recommendation: {issue['recommendation']}")
        else:
            report.append("\n✅ No issues found! The application is secure.")

        report.append("\n" + "=" * 80)
        return "\n".join(report)

    async def run_full_audit(self):
        """Run complete security audit"""
        print("\n🔐 Starting Comprehensive Security and Integration Audit...")
        print("=" * 80)

        async with aiohttp.ClientSession() as session:
            # Run all audits
            await self.audit_ai_analysis_endpoints(session)
            await self.audit_input_validation(session)
            await self.audit_cors(session)
            await self.audit_rate_limiting(session)

        # Check frontend integration (doesn't need session)
        self.check_frontend_integration()

        # Generate and print report
        report = self.generate_report()
        print(report)

        # Save report to file
        with open("/home/user/chat-with-fundamentals/SECURITY_AUDIT_REPORT.md", "w") as f:
            f.write(report)
        print(f"\n📄 Report saved to: SECURITY_AUDIT_REPORT.md")

        return self.results

if __name__ == "__main__":
    audit = SecurityAudit()
    asyncio.run(audit.run_full_audit())

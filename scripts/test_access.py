#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试脚本：检测哪种方式可以访问电视猫
"""

import requests
import time
import random

# 目标URL
TEST_URL = "https://www.tvmao.com/program/duration/370000"

def test_direct():
    """测试1: 直接访问"""
    print("\n" + "="*50)
    print("测试1: 直接访问")
    print("="*50)
    
    try:
        resp = requests.get(TEST_URL, timeout=30)
        print(f"  状态码: {resp.status_code}")
        print(f"  最终URL: {resp.url}")
        return resp.status_code == 200
    except Exception as e:
        print(f"  失败: {e}")
        return False

def test_with_different_headers():
    """测试2: 使用不同的User-Agent"""
    print("\n" + "="*50)
    print("测试2: 模拟手机浏览器")
    print("="*50)
    
    # 模拟手机
    mobile_headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
    }
    
    try:
        resp = requests.get(TEST_URL, headers=mobile_headers, timeout=30)
        print(f"  状态码: {resp.status_code}")
        return resp.status_code == 200
    except Exception as e:
        print(f"  失败: {e}")
        return False

def test_with_session_warmup():
    """测试3: 先访问首页预热session"""
    print("\n" + "="*50)
    print("测试3: Session预热（先访问首页）")
    print("="*50)
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
    })
    
    try:
        # 先访问首页
        print("  访问首页...")
        resp1 = session.get("https://www.tvmao.com/", timeout=30)
        print(f"  首页状态码: {resp1.status_code}")
        
        time.sleep(2)
        
        # 再访问目标页
        print("  访问目标页...")
        resp2 = session.get(TEST_URL, timeout=30)
        print(f"  目标页状态码: {resp2.status_code}")
        
        return resp2.status_code == 200
    except Exception as e:
        print(f"  失败: {e}")
        return False

def test_cors_proxies():
    """测试4: 使用公共CORS代理"""
    print("\n" + "="*50)
    print("测试4: 公共CORS代理")
    print("="*50)
    
    # 一些公共代理（可能不稳定）
    proxies = [
        f"https://api.allorigins.win/raw?url={TEST_URL}",
        f"https://corsproxy.io/?{TEST_URL}",
        f"https://api.codetabs.com/v1/proxy?quest={TEST_URL}",
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for proxy_url in proxies:
        proxy_name = proxy_url.split('/')[2]
        print(f"\n  尝试代理: {proxy_name}")
        try:
            resp = requests.get(proxy_url, headers=headers, timeout=30)
            print(f"    状态码: {resp.status_code}")
            if resp.status_code == 200 and len(resp.text) > 1000:
                print(f"    内容长度: {len(resp.text)} 字节")
                if 'tvmao' in resp.text.lower() or '节目' in resp.text:
                    print(f"    ✓ 成功获取到有效内容!")
                    return True, proxy_name
        except Exception as e:
            print(f"    失败: {e}")
    
    return False, None

def test_alternative_sources():
    """测试5: 测试其他EPG源的可访问性"""
    print("\n" + "="*50)
    print("测试5: 其他EPG数据源")
    print("="*50)
    
    sources = [
        ("央视节目单", "https://tv.cctv.com/epg/index.shtml"),
        ("搜视网", "https://www.tvsou.com/epg/"),
        ("中国广电", "http://www.sarft.net/"),
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    results = []
    for name, url in sources:
        print(f"\n  测试: {name}")
        print(f"  URL: {url}")
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            print(f"    状态码: {resp.status_code}")
            print(f"    内容长度: {len(resp.text)} 字节")
            if resp.status_code == 200:
                results.append((name, url, True))
                print(f"    ✓ 可访问!")
            else:
                results.append((name, url, False))
        except Exception as e:
            print(f"    ✗ 失败: {e}")
            results.append((name, url, False))
    
    return results

def main():
    print("="*60)
    print("GitHub Actions 网络访问测试")
    print("="*60)
    
    # 显示当前IP信息
    print("\n当前网络信息:")
    try:
        ip_info = requests.get("https://ipinfo.io/json", timeout=10).json()
        print(f"  IP: {ip_info.get('ip', 'unknown')}")
        print(f"  地区: {ip_info.get('city', '')}, {ip_info.get('region', '')}, {ip_info.get('country', '')}")
        print(f"  组织: {ip_info.get('org', 'unknown')}")
    except:
        print("  无法获取IP信息")
    
    results = {}
    
    # 运行所有测试
    results['直接访问'] = test_direct()
    results['手机UA'] = test_with_different_headers()
    results['Session预热'] = test_with_session_warmup()
    
    cors_result, cors_proxy = test_cors_proxies()
    results['CORS代理'] = cors_result
    
    alt_results = test_alternative_sources()
    
    # 汇总结果
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    
    print("\n电视猫访问测试:")
    for method, success in results.items():
        status = "✓ 成功" if success else "✗ 失败"
        print(f"  {method}: {status}")
    
    if cors_result:
        print(f"\n推荐使用CORS代理: {cors_proxy}")
    
    print("\n其他EPG源:")
    for name, url, success in alt_results:
        status = "✓ 可用" if success else "✗ 不可用"
        print(f"  {name}: {status}")
    
    # 给出建议
    print("\n" + "="*60)
    print("建议")
    print("="*60)
    
    if results['直接访问'] or results['手机UA'] or results['Session预热']:
        print("✓ 可以直接访问电视猫，使用对应方法即可")
    elif cors_result:
        print(f"✓ 可以通过CORS代理 {cors_proxy} 访问电视猫")
    else:
        available_sources = [name for name, url, success in alt_results if success]
        if available_sources:
            print(f"✓ 建议改用其他EPG源: {', '.join(available_sources)}")
        else:
            print("✗ 所有方法都失败，可能需要使用自建代理")

if __name__ == '__main__':
    main()

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const TOPO_URL = '/india-states.json';

// ── District → State mapping (case-insensitive lookup) ──
const DISTRICT_TO_STATE = {
  // Rajasthan
  'bikaner': 'Rajasthan', 'jaipur': 'Rajasthan', 'jodhpur': 'Rajasthan', 'udaipur': 'Rajasthan',
  'kota': 'Rajasthan', 'ajmer': 'Rajasthan', 'alwar': 'Rajasthan',
  'barmer': 'Rajasthan', 'jaisalmer': 'Rajasthan', 'chittorgarh': 'Rajasthan', 'banswara': 'Rajasthan',
  'bhilwara': 'Rajasthan', 'bundi': 'Rajasthan', 'churu': 'Rajasthan', 'dausa': 'Rajasthan',
  'dholpur': 'Rajasthan', 'dungarpur': 'Rajasthan', 'hanumangarh': 'Rajasthan', 'jalor': 'Rajasthan',
  'jhalawar': 'Rajasthan', 'jhunjhunu': 'Rajasthan', 'karauli': 'Rajasthan', 'nagaur': 'Rajasthan',
  'pali': 'Rajasthan', 'pratapgarh': 'Rajasthan', 'rajsamand': 'Rajasthan',
  'sawai madhopur': 'Rajasthan', 'sikar': 'Rajasthan', 'sirohi': 'Rajasthan', 'tonk': 'Rajasthan',
  'ganganagar': 'Rajasthan', 'baran': 'Rajasthan', 'bharatpur': 'Rajasthan',

  // Maharashtra
  'nagpur': 'Maharashtra', 'mumbai': 'Maharashtra', 'pune': 'Maharashtra', 'thane': 'Maharashtra',
  'ahmednagar': 'Maharashtra', 'akola': 'Maharashtra', 'amravati': 'Maharashtra',
  'aurangabad': 'Maharashtra', 'beed': 'Maharashtra', 'bhandara': 'Maharashtra',
  'buldhana': 'Maharashtra', 'chandrapur': 'Maharashtra', 'dhule': 'Maharashtra',
  'gadchiroli': 'Maharashtra', 'gondia': 'Maharashtra', 'hingoli': 'Maharashtra',
  'jalgaon': 'Maharashtra', 'jalna': 'Maharashtra', 'kolhapur': 'Maharashtra',
  'latur': 'Maharashtra', 'nanded': 'Maharashtra', 'nandurbar': 'Maharashtra',
  'nashik': 'Maharashtra', 'osmanabad': 'Maharashtra', 'palghar': 'Maharashtra',
  'parbhani': 'Maharashtra', 'ratnagiri': 'Maharashtra', 'sangli': 'Maharashtra',
  'satara': 'Maharashtra', 'sindhudurg': 'Maharashtra', 'solapur': 'Maharashtra',
  'wardha': 'Maharashtra', 'washim': 'Maharashtra', 'yavatmal': 'Maharashtra', 'raigad': 'Maharashtra',
  'mumbai city': 'Maharashtra', 'mumbai suburban': 'Maharashtra', 'dharashiv': 'Maharashtra',

  // Assam
  'bongaigaon': 'Assam', 'guwahati': 'Assam', 'dibrugarh': 'Assam', 'jorhat': 'Assam',
  'silchar': 'Assam', 'barpeta': 'Assam', 'cachar': 'Assam', 'darrang': 'Assam',
  'dhemaji': 'Assam', 'dhubri': 'Assam', 'goalpara': 'Assam', 'golaghat': 'Assam',
  'hailakandi': 'Assam', 'karimganj': 'Assam', 'kokrajhar': 'Assam', 'lakhimpur': 'Assam',
  'morigaon': 'Assam', 'nagaon': 'Assam', 'nalbari': 'Assam', 'sivasagar': 'Assam',
  'sonitpur': 'Assam', 'tinsukia': 'Assam', 'udalguri': 'Assam', 'kamrup': 'Assam',
  'baksa': 'Assam', 'chirang': 'Assam', 'dima hasao': 'Assam', 'karbi anglong': 'Assam',
  'marigaon': 'Assam', 'west karbi anglong': 'Assam', 'hojai': 'Assam', 'biswanath': 'Assam',
  'charaideo': 'Assam', 'kamrup metropolitan': 'Assam',

  // Uttar Pradesh
  'fategarh': 'Uttar Pradesh', 'fatehgarh': 'Uttar Pradesh', 'lucknow': 'Uttar Pradesh',
  'kanpur': 'Uttar Pradesh', 'agra': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh',
  'aligarh': 'Uttar Pradesh', 'allahabad': 'Uttar Pradesh', 'prayagraj': 'Uttar Pradesh',
  'meerut': 'Uttar Pradesh', 'gorakhpur': 'Uttar Pradesh', 'noida': 'Uttar Pradesh',
  'ghaziabad': 'Uttar Pradesh', 'bareilly': 'Uttar Pradesh', 'moradabad': 'Uttar Pradesh',
  'saharanpur': 'Uttar Pradesh', 'jhansi': 'Uttar Pradesh', 'ayodhya': 'Uttar Pradesh',
  'amroha': 'Uttar Pradesh', 'azamgarh': 'Uttar Pradesh', 'bahraich': 'Uttar Pradesh',
  'ballia': 'Uttar Pradesh', 'barabanki': 'Uttar Pradesh', 'basti': 'Uttar Pradesh',
  'bijnor': 'Uttar Pradesh', 'bulandshahr': 'Uttar Pradesh', 'deoria': 'Uttar Pradesh',
  'farrukhabad': 'Uttar Pradesh', 'fatehpur': 'Uttar Pradesh', 'firozabad': 'Uttar Pradesh',
  'ghazipur': 'Uttar Pradesh', 'gonda': 'Uttar Pradesh', 'hamirpur': 'Uttar Pradesh',
  'hathras': 'Uttar Pradesh', 'jalaun': 'Uttar Pradesh', 'jaunpur': 'Uttar Pradesh',
  'kannauj': 'Uttar Pradesh', 'kasganj': 'Uttar Pradesh', 'kushinagar': 'Uttar Pradesh',
  'lalitpur': 'Uttar Pradesh', 'mainpuri': 'Uttar Pradesh', 'mathura': 'Uttar Pradesh',
  'mirzapur': 'Uttar Pradesh', 'muzaffarnagar': 'Uttar Pradesh', 'rampur': 'Uttar Pradesh',
  'sambhal': 'Uttar Pradesh', 'shahjahanpur': 'Uttar Pradesh', 'sitapur': 'Uttar Pradesh',
  'sultanpur': 'Uttar Pradesh', 'unnao': 'Uttar Pradesh', 'mau': 'Uttar Pradesh',
  'ambedkar nagar': 'Uttar Pradesh', 'amethi': 'Uttar Pradesh', 'auraiya': 'Uttar Pradesh',
  'baghpat': 'Uttar Pradesh', 'banda': 'Uttar Pradesh', 'bhadohi': 'Uttar Pradesh',
  'chandauli': 'Uttar Pradesh', 'chitrakoot': 'Uttar Pradesh', 'etah': 'Uttar Pradesh',
  'etawah': 'Uttar Pradesh', 'gautam buddha nagar': 'Uttar Pradesh',
  'mahrajganj': 'Uttar Pradesh', 'mahoba': 'Uttar Pradesh', 'pratapgarh': 'Uttar Pradesh',
  'rae bareli': 'Uttar Pradesh', 'sant kabir nagar': 'Uttar Pradesh',
  'shamli': 'Uttar Pradesh', 'shravasti': 'Uttar Pradesh', 'siddharth nagar': 'Uttar Pradesh',
  'sonbhadra': 'Uttar Pradesh', 'kaushambi': 'Uttar Pradesh',
  'gautam buddha nagar': 'Uttar Pradesh',

  // Gujarat
  'ahmedabad': 'Gujarat', 'surat': 'Gujarat', 'rajkot': 'Gujarat', 'vadodara': 'Gujarat',
  'gandhinagar': 'Gujarat', 'bhavnagar': 'Gujarat', 'jamnagar': 'Gujarat', 'junagadh': 'Gujarat',
  'baroda': 'Gujarat', 'anand': 'Gujarat', 'bharuch': 'Gujarat', 'dahod': 'Gujarat',
  'kachchh': 'Gujarat', 'kheda': 'Gujarat', 'mahesana': 'Gujarat', 'narmada': 'Gujarat',
  'navsari': 'Gujarat', 'patan': 'Gujarat', 'porbandar': 'Gujarat', 'sabarkantha': 'Gujarat',
  'surendranagar': 'Gujarat', 'tapi': 'Gujarat', 'valsad': 'Gujarat',
  'morbi': 'Gujarat', 'devbhoomi dwarka': 'Gujarat', 'gir somnath': 'Gujarat',
  'chhota udepur': 'Gujarat', 'mahisagar': 'Gujarat', 'aravalli': 'Gujarat', 'botad': 'Gujarat',
  'amreli': 'Gujarat', 'banaskantha': 'Gujarat',

  // Tamil Nadu
  'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu',
  'tiruchirappalli': 'Tamil Nadu', 'salem': 'Tamil Nadu', 'tirunelveli': 'Tamil Nadu',
  'vellore': 'Tamil Nadu', 'erode': 'Tamil Nadu', 'dindigul': 'Tamil Nadu',
  'cuddalore': 'Tamil Nadu', 'dharmapuri': 'Tamil Nadu', 'kancheepuram': 'Tamil Nadu',
  'karur': 'Tamil Nadu', 'krishnagiri': 'Tamil Nadu', 'nilgiris': 'Tamil Nadu',
  'tiruvallur': 'Tamil Nadu', 'tiruvannamalai': 'Tamil Nadu', 'tiruvarur': 'Tamil Nadu',
  'virudhunagar': 'Tamil Nadu', 'tiruppur': 'Tamil Nadu', 'thoothukkudi': 'Tamil Nadu',
  'kanyakumari': 'Tamil Nadu', 'ariyalur': 'Tamil Nadu', 'chengalpattu': 'Tamil Nadu',
  'kallakurichi': 'Tamil Nadu', 'mayiladuthurai': 'Tamil Nadu', 'nagapattinam': 'Tamil Nadu',
  'namakkal': 'Tamil Nadu', 'perambalur': 'Tamil Nadu', 'pudukkottai': 'Tamil Nadu',
  'ramanathapuram': 'Tamil Nadu', 'ranipet': 'Tamil Nadu', 'sivaganga': 'Tamil Nadu',
  'tenkasi': 'Tamil Nadu', 'tanjore': 'Tamil Nadu', 'theni': 'Tamil Nadu',
  'tirupattur': 'Tamil Nadu',

  // Karnataka
  'bangalore': 'Karnataka', 'bengaluru': 'Karnataka', 'mysore': 'Karnataka',
  'belgaum': 'Karnataka', 'belagavi': 'Karnataka', 'hubli': 'Karnataka',
  'dharwad': 'Karnataka', 'kalaburagi': 'Karnataka', 'gulbarga': 'Karnataka',
  'bidar': 'Karnataka', 'raichur': 'Karnataka', 'bellary': 'Karnataka',
  'hassan': 'Karnataka', 'mandya': 'Karnataka', 'kolar': 'Karnataka',
  'chitradurga': 'Karnataka', 'davangere': 'Karnataka', 'shimoga': 'Karnataka',
  'tumkur': 'Karnataka', 'udupi': 'Karnataka', 'kodagu': 'Karnataka',
  'bagalkot': 'Karnataka', 'haveri': 'Karnataka', 'gadag': 'Karnataka',
  'uttara kannada': 'Karnataka', 'yadgir': 'Karnataka', 'vijayapura': 'Karnataka',
  'bangalore urban': 'Karnataka', 'bangalore rural': 'Karnataka',
  'chikkaballapur': 'Karnataka', 'chikkamagaluru': 'Karnataka',
  'chamarajanagar': 'Karnataka', 'dakshina kannada': 'Karnataka',
  'ramanagara': 'Karnataka',

  // Delhi
  'delhi': 'Delhi', 'new delhi': 'Delhi', 'central': 'Delhi', 'east delhi': 'Delhi',
  'north delhi': 'Delhi', 'south delhi': 'Delhi', 'west delhi': 'Delhi', 'shahdara': 'Delhi',
  'north east': 'Delhi', 'north west': 'Delhi', 'south east': 'Delhi', 'south west': 'Delhi',

  // West Bengal
  'kolkata': 'West Bengal', 'howrah': 'West Bengal', 'darjeeling': 'West Bengal',
  'siliguri': 'West Bengal', 'burdwan': 'West Bengal', 'asansol': 'West Bengal',
  'hooghly': 'West Bengal', 'malda': 'West Bengal', 'murshidabad': 'West Bengal',
  'birbhum': 'West Bengal', 'bankura': 'West Bengal', 'purulia': 'West Bengal',
  'nadia': 'West Bengal', 'jalpaiguri': 'West Bengal', 'cooch behar': 'West Bengal',
  'paschim medinipur': 'West Bengal', 'purba medinipur': 'West Bengal',
  'north 24 parganas': 'West Bengal', 'south 24 parganas': 'West Bengal',
  'barrackpore': 'West Bengal', 'kalimpong': 'West Bengal',

  // Madhya Pradesh
  'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh', 'jabalpur': 'Madhya Pradesh',
  'gwalior': 'Madhya Pradesh', 'ujjain': 'Madhya Pradesh', 'sagar': 'Madhya Pradesh',
  'satna': 'Madhya Pradesh', 'rewa': 'Madhya Pradesh', 'dewas': 'Madhya Pradesh',
  'dhar': 'Madhya Pradesh', 'chhindwara': 'Madhya Pradesh', 'ratlam': 'Madhya Pradesh',
  'mandla': 'Madhya Pradesh', 'sehore': 'Madhya Pradesh', 'vidisha': 'Madhya Pradesh',
  'balaghat': 'Madhya Pradesh', 'betul': 'Madhya Pradesh', 'bhind': 'Madhya Pradesh',
  'chhatarpur': 'Madhya Pradesh', 'damoh': 'Madhya Pradesh', 'harda': 'Madhya Pradesh',
  'hoshangabad': 'Madhya Pradesh', 'narmadapuram': 'Madhya Pradesh',
  'alirajpur': 'Madhya Pradesh', 'barwani': 'Madhya Pradesh', 'burhanpur': 'Madhya Pradesh',
  'datia': 'Madhya Pradesh', 'jhabua': 'Madhya Pradesh', 'katni': 'Madhya Pradesh',
  'khargone': 'Madhya Pradesh', 'mandsaur': 'Madhya Pradesh', 'morena': 'Madhya Pradesh',
  'narsinghpur': 'Madhya Pradesh', 'panna': 'Madhya Pradesh', 'raisen': 'Madhya Pradesh',
  'rajgarh': 'Madhya Pradesh', 'seoni': 'Madhya Pradesh', 'shahdol': 'Madhya Pradesh',
  'shajapur': 'Madhya Pradesh', 'shyopur': 'Madhya Pradesh', 'sidhi': 'Madhya Pradesh',
  'tikamgarh': 'Madhya Pradesh', 'umaria': 'Madhya Pradesh',

  // Kerala
  'ernakulam': 'Kerala', 'thiruvananthapuram': 'Kerala', 'kozhikode': 'Kerala',
  'thrissur': 'Kerala', 'kollam': 'Kerala', 'kottayam': 'Kerala',
  'palakkad': 'Kerala', 'malappuram': 'Kerala', 'alappuzha': 'Kerala',
  'idukki': 'Kerala', 'wayanad': 'Kerala', 'kasaragod': 'Kerala',
  'kannur': 'Kerala', 'pathanamthitta': 'Kerala',

  // Andhra Pradesh
  'visakhapatnam': 'Andhra Pradesh', 'vijayawada': 'Andhra Pradesh',
  'guntur': 'Andhra Pradesh', 'nellore': 'Andhra Pradesh', 'tirupati': 'Andhra Pradesh',
  'krishna': 'Andhra Pradesh', 'kurnool': 'Andhra Pradesh', 'east godavari': 'Andhra Pradesh',
  'west godavari': 'Andhra Pradesh', 'chittoor': 'Andhra Pradesh', 'prakasam': 'Andhra Pradesh',
  'srikakulam': 'Andhra Pradesh', 'vizianagaram': 'Andhra Pradesh', 'anantapur': 'Andhra Pradesh',
  'kadapa': 'Andhra Pradesh', 'YSR': 'Andhra Pradesh', 'ntr': 'Andhra Pradesh',
  'bapatla': 'Andhra Pradesh', 'eluru': 'Andhra Pradesh', 'konaseema': 'Andhra Pradesh',
  'annamayya': 'Andhra Pradesh', 'nandyal': 'Andhra Pradesh', 'kakinada': 'Andhra Pradesh',
  'ongole': 'Andhra Pradesh',

  // Telangana
  'hyderabad': 'Telangana', 'warangal': 'Telangana', 'karimnagar': 'Telangana', 'nizamabad': 'Telangana',
  'khammam': 'Telangana', 'mahabubnagar': 'Telangana', 'nalgonda': 'Telangana',
  'adilabad': 'Telangana', 'medak': 'Telangana', 'rangareddy': 'Telangana',
  'sangareddy': 'Telangana', 'bhadradri kothagudem': 'Telangana',
  'jagtial': 'Telangana', 'jangaon': 'Telangana', 'kamareddy': 'Telangana',
  'komaram bheem': 'Telangana', 'mahabubabad': 'Telangana', 'mancherial': 'Telangana',
  'medchal': 'Telangana', 'nirmal': 'Telangana', 'peddapalli': 'Telangana',
  'rajanna sircilla': 'Telangana', 'ranga reddy': 'Telangana', 'siddipet': 'Telangana',
  'suryapet': 'Telangana', 'vikarabad': 'Telangana', 'wanaparthy': 'Telangana',
  'yadadri bhuvanagiri': 'Telangana', 'mulugu': 'Telangana', 'nagar kurnool': 'Telangana',
  'narayanpet': 'Telangana', 'ramagundam': 'Telangana',

  // Punjab
  'ludhiana': 'Punjab', 'amritsar': 'Punjab', 'jalandhar': 'Punjab', 'patiala': 'Punjab',
  'bathinda': 'Punjab', 'mohali': 'Punjab', 'hoshiarpur': 'Punjab', 'kapurthala': 'Punjab',
  'pathankot': 'Punjab', 'sangrur': 'Punjab', 'moga': 'Punjab',
  'barnala': 'Punjab', 'faridkot': 'Punjab', 'fatehgarh sahib': 'Punjab',
  'fazilka': 'Punjab', 'ferozepur': 'Punjab', 'mansa': 'Punjab',
  'rupnagar': 'Punjab', 'sahibzada ajit singh nagar': 'Punjab',
  'shaheed bhagat singh nagar': 'Punjab', 'tarn taran': 'Punjab', 'malerkotla': 'Punjab',

  // Haryana
  'gurgaon': 'Haryana', 'faridabad': 'Haryana', 'panipat': 'Haryana', 'karnal': 'Haryana',
  'hisar': 'Haryana', 'rohtak': 'Haryana', 'ambala': 'Haryana', 'sonipat': 'Haryana',
  'yamunanagar': 'Haryana', 'kurukshetra': 'Haryana', 'bhiwani': 'Haryana',
  'fatehabad': 'Haryana', 'jhajjar': 'Haryana', 'jind': 'Haryana', 'kaithal': 'Haryana',
  'mahendragarh': 'Haryana', 'palwal': 'Haryana', 'rewari': 'Haryana', 'sirsa': 'Haryana',
  'charkhi dadri': 'Haryana', 'mewat': 'Haryana',

  // Bihar
  'patna': 'Bihar', 'gaya': 'Bihar', 'muzaffarpur': 'Bihar', 'bhagalpur': 'Bihar',
  'darbhanga': 'Bihar', 'nalanda': 'Bihar', 'munger': 'Bihar', 'purnia': 'Bihar',
  'begusarai': 'Bihar', 'katihar': 'Bihar', 'araria': 'Bihar', 'arwal': 'Bihar',
  'aurangabad': 'Bihar', 'banka': 'Bihar', 'bhojpur': 'Bihar', 'buxar': 'Bihar',
  'gopalganj': 'Bihar', 'jamui': 'Bihar', 'kishanganj': 'Bihar', 'lakhisarai': 'Bihar',
  'madhepura': 'Bihar', 'madhubani': 'Bihar', 'nawada': 'Bihar', 'rohtas': 'Bihar',
  'saharsa': 'Bihar', 'samastipur': 'Bihar', 'saran': 'Bihar', 'sitamarhi': 'Bihar',
  'siwan': 'Bihar', 'supaul': 'Bihar', 'vaishali': 'Bihar',
  'west champaran': 'Bihar', 'east champaran': 'Bihar', 'kaimur': 'Bihar',

  // Jharkhand
  'ranchi': 'Jharkhand', 'jamshedpur': 'Jharkhand', 'dhanbad': 'Jharkhand',
  'bokaro': 'Jharkhand', 'hazaribag': 'Jharkhand', 'deoghar': 'Jharkhand',
  'chatra': 'Jharkhand', 'dumka': 'Jharkhand', 'east singhbhum': 'Jharkhand',
  'garhwa': 'Jharkhand', 'giridih': 'Jharkhand', 'godda': 'Jharkhand',
  'gumla': 'Jharkhand', 'jamtara': 'Jharkhand', 'khunti': 'Jharkhand',
  'koderma': 'Jharkhand', 'latehar': 'Jharkhand', 'lohardaga': 'Jharkhand',
  'pakur': 'Jharkhand', 'palamu': 'Jharkhand', 'ramgarh': 'Jharkhand',
  'sahibganj': 'Jharkhand', 'seraikela kharsawan': 'Jharkhand', 'simdega': 'Jharkhand',
  'west singhbhum': 'Jharkhand',

  // Chhattisgarh
  'raipur': 'Chhattisgarh', 'bilaspur': 'Chhattisgarh', 'durg': 'Chhattisgarh',
  'korba': 'Chhattisgarh', 'bastar': 'Chhattisgarh',
  'balod': 'Chhattisgarh', 'baloda bazar': 'Chhattisgarh', 'balrampur': 'Chhattisgarh',
  'bemetara': 'Chhattisgarh', 'bijapur': 'Chhattisgarh', 'dantewada': 'Chhattisgarh',
  'dhamtari': 'Chhattisgarh', 'gariaband': 'Chhattisgarh', 'janjgir champa': 'Chhattisgarh',
  'jashpur': 'Chhattisgarh', 'kabirdham': 'Chhattisgarh', 'koriya': 'Chhattisgarh',
  'mahasamund': 'Chhattisgarh', 'narayanpur': 'Chhattisgarh', 'raigarh': 'Chhattisgarh',
  'rajnandgaon': 'Chhattisgarh', 'sukma': 'Chhattisgarh', 'surajpur': 'Chhattisgarh',
  'suraguja': 'Chhattisgarh', 'kondagaon': 'Chhattisgarh',

  // Odisha
  'bhubaneswar': 'Odisha', 'cuttack': 'Odisha', 'puri': 'Odisha',
  'sambalpur': 'Odisha', 'berhampur': 'Odisha', 'rourkela': 'Odisha',
  'angul': 'Odisha', 'balangir': 'Odisha', 'balasore': 'Odisha', 'bargarh': 'Odisha',
  'bhadrak': 'Odisha', 'boudh': 'Odisha', 'deogarh': 'Odisha', 'dhenkanal': 'Odisha',
  'gajapati': 'Odisha', 'ganjam': 'Odisha', 'jagatsinghpur': 'Odisha', 'jajpur': 'Odisha',
  'jharsuguda': 'Odisha', 'kandhamal': 'Odisha', 'kendrapara': 'Odisha',
  'keonjhar': 'Odisha', 'khordha': 'Odisha', 'koraput': 'Odisha',
  'malkangiri': 'Odisha', 'mayurbhanj': 'Odisha', 'nabarangapur': 'Odisha',
  'nayagarh': 'Odisha', 'nuapada': 'Odisha', 'rayagada': 'Odisha',
  'subarnapur': 'Odisha', 'sundargarh': 'Odisha', 'debagarh': 'Odisha',

  // Goa
  'goa': 'Goa', 'panaji': 'Goa', 'north goa': 'Goa', 'south goa': 'Goa',

  // Uttarakhand
  'dehradun': 'Uttaranchal', 'haridwar': 'Uttaranchal', 'nainital': 'Uttaranchal',
  'haldwani': 'Uttaranchal', 'rishikesh': 'Uttaranchal',
  'almora': 'Uttaranchal', 'bageshwar': 'Uttaranchal', 'chamoli': 'Uttaranchal',
  'champawat': 'Uttaranchal', 'pauri garhwal': 'Uttaranchal',
  'pithoragarh': 'Uttaranchal', 'rudraprayag': 'Uttaranchal',
  'tehri garhwal': 'Uttaranchal', 'udham singh nagar': 'Uttaranchal', 'uttarkashi': 'Uttaranchal',

  // Himachal Pradesh
  'shimla': 'Himachal Pradesh', 'manali': 'Himachal Pradesh', 'dharamshala': 'Himachal Pradesh',
  'kangra': 'Himachal Pradesh', 'mandi': 'Himachal Pradesh', 'kullu': 'Himachal Pradesh',
  'bilaspur': 'Himachal Pradesh', 'chamba': 'Himachal Pradesh', 'hamirpur': 'Himachal Pradesh',
  'kinnaur': 'Himachal Pradesh', 'lahaul spiti': 'Himachal Pradesh',
  'sirmaur': 'Himachal Pradesh', 'solan': 'Himachal Pradesh', 'una': 'Himachal Pradesh',

  // Jammu and Kashmir
  'srinagar': 'Jammu and Kashmir', 'jammu': 'Jammu and Kashmir', 'anantnag': 'Jammu and Kashmir',
  'baramulla': 'Jammu and Kashmir', 'kathua': 'Jammu and Kashmir', 'udhampur': 'Jammu and Kashmir',
  'bandipora': 'Jammu and Kashmir', 'budgam': 'Jammu and Kashmir', 'doda': 'Jammu and Kashmir',
  'ganderbal': 'Jammu and Kashmir', 'kishtwar': 'Jammu and Kashmir',
  'kupwara': 'Jammu and Kashmir', 'kulgam': 'Jammu and Kashmir',
  'poonch': 'Jammu and Kashmir', 'pulwama': 'Jammu and Kashmir',
  'rajouri': 'Jammu and Kashmir', 'ramban': 'Jammu and Kashmir',
  'reasi': 'Jammu and Kashmir', 'samba': 'Jammu and Kashmir', 'shopian': 'Jammu and Kashmir',

  // Chandigarh
  'chandigarh': 'Chandigarh',

  // Sikkim
  'gangtok': 'Sikkim', 'east sikkim': 'Sikkim', 'north sikkim': 'Sikkim',
  'south sikkim': 'Sikkim', 'west sikkim': 'Sikkim',

  // Meghalaya
  'shillong': 'Meghalaya', 'east garo hills': 'Meghalaya', 'east jaintia hills': 'Meghalaya',
  'east khasi hills': 'Meghalaya', 'north garo hills': 'Meghalaya', 'ri bhoi': 'Meghalaya',
  'south garo hills': 'Meghalaya', 'west garo hills': 'Meghalaya',
  'west jaintia hills': 'Meghalaya', 'west khasi hills': 'Meghalaya',

  // Manipur
  'imphal': 'Manipur', 'bishnupur': 'Manipur', 'chandel': 'Manipur',
  'churachandpur': 'Manipur', 'imphal east': 'Manipur', 'imphal west': 'Manipur',
  'jiribam': 'Manipur', 'kakching': 'Manipur', 'kamjong': 'Manipur',
  'noney': 'Manipur', 'pherzawl': 'Manipur', 'senapati': 'Manipur',
  'tamenglong': 'Manipur', 'tengnoupal': 'Manipur', 'thoubal': 'Manipur', 'ukhrul': 'Manipur',

  // Nagaland
  'kohima': 'Nagaland', 'dimapur': 'Nagaland', 'mokokchung': 'Nagaland',
  'mon': 'Nagaland', 'peren': 'Nagaland', 'phek': 'Nagaland',
  'tuensang': 'Nagaland', 'wokha': 'Nagaland', 'zunheboto': 'Nagaland',
  'longleng': 'Nagaland', 'noklak': 'Nagaland',

  // Mizoram
  'aizawl': 'Mizoram', 'champhai': 'Mizoram', 'kolasib': 'Mizoram',
  'lawngtlai': 'Mizoram', 'lunglei': 'Mizoram', 'mamit': 'Mizoram',
  'saiha': 'Mizoram', 'serchhip': 'Mizoram',

  // Tripura
  'agartala': 'Tripura', 'dhalai': 'Tripura', 'gomati': 'Tripura',
  'khowai': 'Tripura', 'sepahijala': 'Tripura', 'unakoti': 'Tripura', 'west tripura': 'Tripura',

  // Arunachal Pradesh
  'itanagar': 'Arunachal Pradesh', 'tawang': 'Arunachal Pradesh',
  'west kameng': 'Arunachal Pradesh', 'east kameng': 'Arunachal Pradesh',
  'papum pare': 'Arunachal Pradesh', 'changlang': 'Arunachal Pradesh',
  'lohit': 'Arunachal Pradesh', 'namsai': 'Arunachal Pradesh',

  // Dadra and Nagar Haveli
  'dadra': 'Dadra and Nagar Haveli', 'nagar haveli': 'Dadra and Nagar Haveli',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli',

  // Ladakh
  'leh': 'Ladakh', 'kargil': 'Ladakh', 'ladakh': 'Ladakh',

  // Puducherry
  'puducherry': 'Puducherry', 'karaikal': 'Puducherry', 'mahe': 'Puducherry', 'yanam': 'Puducherry',

  // Daman and Diu
  'daman': 'Daman and Diu', 'diu': 'Daman and Diu', 'daman and diu': 'Daman and Diu',
  'andaman and nicobar': 'Andaman and Nicobar', 'lakshadweep': 'Lakshadweep',

  // States as values
  'rajasthan': 'Rajasthan', 'maharashtra': 'Maharashtra', 'assam': 'Assam',
  'uttar pradesh': 'Uttar Pradesh', 'gujarat': 'Gujarat', 'tamil nadu': 'Tamil Nadu',
  'karnataka': 'Karnataka', 'delhi': 'Delhi', 'west bengal': 'West Bengal',
  'madhya pradesh': 'Madhya Pradesh', 'kerala': 'Kerala', 'andhra pradesh': 'Andhra Pradesh',
  'telangana': 'Telangana', 'punjab': 'Punjab', 'haryana': 'Haryana', 'bihar': 'Bihar',
  'jharkhand': 'Jharkhand', 'chhattisgarh': 'Chhattisgarh', 'odisha': 'Odisha',
  'orissa': 'Odisha', 'goa': 'Goa', 'uttaranchal': 'Uttaranchal',
  'uttarakhand': 'Uttaranchal', 'himachal pradesh': 'Himachal Pradesh',
  'jammu and kashmir': 'Jammu and Kashmir',
  'chandigarh': 'Chandigarh', 'sikkim': 'Sikkim', 'meghalaya': 'Meghalaya',
  'manipur': 'Manipur', 'nagaland': 'Nagaland', 'mizoram': 'Mizoram',
  'tripura': 'Tripura', 'arunachal pradesh': 'Arunachal Pradesh',
  'ladakh': 'Ladakh', 'puducherry': 'Puducherry',
};

function getProjectState(district) {
  if (!district || district.trim() === '') return null;
  const d = district.trim().toLowerCase();
  // Direct match
  if (DISTRICT_TO_STATE[d]) return DISTRICT_TO_STATE[d];
  // Partial match
  for (const [key, state] of Object.entries(DISTRICT_TO_STATE)) {
    if (d.includes(key) || key.includes(d)) return state;
  }
  return null;
}

export default function IndiaProjectMap() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'projects'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('All projects:', data.map(p => ({ name: p.PROJECT_NAME, district: p.DISTRICT, region: p.REGION, status: p.ACTIVE_STATUS })));
        setProjects(data);
      } catch (e) {
        console.error('Map fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stateMap = useMemo(() => {
    const m = {};
    projects.forEach(p => {
      const st = getProjectState(p.DISTRICT) || getProjectState(p.REGION);
      if (!st) return;
      if (!m[st]) m[st] = { count: 0, projects: [], manpower: 0 };
      m[st].count++;
      m[st].projects.push(p);
      m[st].manpower += Number(p.REQ_MANPOWER) || Number(p.CURRENT_MANPOWER) || 0;
    });
    return m;
  }, [projects]);

  const activeStates = useMemo(() => {
    const states = Object.keys(stateMap);
    console.log('Active states:', states);
    return states;
  }, [stateMap]);
  const hasSelection = selectedState && stateMap[selectedState];
  const selected = hasSelection ? stateMap[selectedState] : null;

  const handleStateClick = (stateName) => {
    if (activeStates.includes(stateName)) {
      setSelectedState(prev => prev === stateName ? null : stateName);
    }
  };

  const handleMouseEnter = (geo, e) => {
    const name = geo.properties?.name || '';
    setTooltip({ name, data: stateMap[name] || null });
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const getStateFill = (name) => {
    if (selectedState === name) return '#0055ff';
    if (activeStates.includes(name)) return 'rgba(0,85,255,0.4)';
    return 'var(--surface-2)';
  };

  if (loading) {
    return (
      <div style={{ padding: 30, textAlign: 'center', color: '#888', backgroundColor: 'var(--surface)', borderRadius: 15, border: '1px solid var(--border)', marginBottom: 24 }}>
        Loading map data...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--surface)', borderRadius: 15, border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 24, overflow: 'visible' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>🇮🇳 India Project Map</h3>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Map ── */}
        <div style={{ flex: hasSelection ? '0 0 60%' : '1 1 100%', maxWidth: hasSelection ? '60%' : '100%', transition: 'flex 0.3s ease' }}>
          <div style={{ overflow: 'visible' }}>
            <ComposableMap
              width={800}
              height={400}
              projection="geoMercator"
              projectionConfig={{ scale: 1000, center: [82, 22] }}
              style={{ width: '100%', height: 'auto', overflow: 'visible' }}
            >
              <Geographies geography={TOPO_URL}>
                {({ geographies }) => geographies.map(geo => {
                  const name = geo.properties?.name || '';
                  const fill = getStateFill(name);
                  const isActive = activeStates.includes(name);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleStateClick(name)}
                      onMouseEnter={(e) => handleMouseEnter(geo, e)}
                      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill, stroke: 'var(--border-strong, #444)', strokeWidth: 0.75,
                          outline: 'none', cursor: isActive ? 'pointer' : 'default',
                          filter: selectedState === name ? 'drop-shadow(0 2px 6px rgba(0,85,255,0.6))' : 'none',
                          transition: 'fill 0.2s, filter 0.2s',
                        },
                        hover: {
                          fill: isActive ? 'rgba(0,85,255,0.6)' : 'var(--surface-3)',
                          stroke: '#fff', strokeWidth: 1, outline: 'none',
                          cursor: isActive ? 'pointer' : 'default',
                        },
                        pressed: { fill: '#0055ff', stroke: '#fff', strokeWidth: 1, outline: 'none' },
                      }}
                    />
                  );
                })}
              </Geographies>
            </ComposableMap>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 11, color: '#888' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, backgroundColor: 'rgba(0,85,255,0.4)', marginRight: 4, verticalAlign: 'middle' }} />Active</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, backgroundColor: '#0055ff', marginRight: 4, verticalAlign: 'middle' }} />Selected</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', marginRight: 4, verticalAlign: 'middle' }} />No Projects</span>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>States</div><div style={{ fontSize: 18, fontWeight: 800, color: '#0055ff' }}>{activeStates.length}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Projects</div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{projects.length}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Manpower</div><div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{projects.reduce((s, p) => s + (Number(p.REQ_MANPOWER) || Number(p.CURRENT_MANPOWER) || 0), 0)}</div></div>
          </div>
        </div>

        {/* ── Details panel (only when a state with projects is selected) ── */}
        {selected && (
          <div style={{ flex: '0 0 40%', maxWidth: '40%', minHeight: 400, backgroundColor: 'var(--surface-2, #1a1a1a)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(0,85,255,0.08)' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{selectedState}</div>
                <div style={{ fontSize: 12, color: '#0055ff', fontWeight: 600, marginTop: 2 }}>
                  {selected.count} Active Project{selected.count > 1 ? 's' : ''} · {selected.manpower} Workers
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {selected.projects.map((p, i) => (
                  <div key={p.id || i} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--surface, #111)', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{p.PROJECT_NAME || 'Unnamed'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {p.TYPE && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(0,85,255,0.15)', color: '#0055ff' }}>{p.TYPE}</span>}
                      {p.DISTRICT && <span style={{ fontSize: 11, color: '#888' }}>📍 {p.DISTRICT}</span>}
                    </div>
                    {p.ACCOUNTANT && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>👤 {p.ACCOUNTANT}</div>}
                    <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>
                      Manpower: {Number(p.REQ_MANPOWER) || Number(p.CURRENT_MANPOWER) || 0}
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8 }}>
                  Click another state or click again to deselect
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip (only when no state selected) */}
      {tooltip && !hasSelection && (
        <div style={{
          position: 'fixed', left: tooltipPos.x + 14, top: tooltipPos.y - 10,
          pointerEvents: 'none', zIndex: 9999,
          backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)',
          borderRadius: 10, padding: '10px 14px', minWidth: 160, maxWidth: 260,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 2 }}>{tooltip.name}</div>
          {tooltip.data ? (
            <div style={{ color: '#0055ff', fontWeight: 600 }}>
              {tooltip.data.count} Project{tooltip.data.count > 1 ? 's' : ''} · {tooltip.data.manpower} workers
            </div>
          ) : (
            <div style={{ color: '#666' }}>No active projects</div>
          )}
        </div>
      )}
    </div>
  );
}
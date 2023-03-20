#include <iostream>
#include <math.h>
 
using namespace std;
 
float calculate_real_scale(float atk_interval, float anim_length, float max_anim_scale); //计算实际动画比例
int calculate_predelay_frame(float event_time, float scale); //计算实际前摇（帧）
int calculate_postdelay_frame(float anim_length, float scale, int predelay); //计算实际后摇（帧）
int calculate_real_duration_in_frame(int predelay, int postdelay); //计算实际持续（阻回）（帧）
float calculate_cooldown_in_frame(float atk_interval); //计算冷却（帧）
int calculate_real_interval_in_frame(int real_duration, float cooldown); //计算实际攻击间隔（帧）
 
const int FRAME_PER_SECOND = 30;
const float MIN_ANIM_SCALE = 0.1;
 
bool reset_cd = 1; //是否有重置冷却策略（通常为1，山/重岳/迷迭香普攻等使用AbilityXXGroup的为0）
bool rely_on_atk_speed = 1; //是否依赖攻击速度
float set_cooldown = 0.0f; //不依赖攻击速度时，设置的冷却（秒）
float atk_interval = 19.0f/30.0f; //标注攻击间隔（秒）
float anim_length = 35.0f/30.0f; //动画长度（秒）
float max_anim_scale = 1.0f; //最长动画拉伸比例（设置为-1时无限拉伸）
float event_time = 15.0f/30.0f; //攻击事件的时间（秒）（如果没有数据就等于atk_interval）
void preprocess_loop(float atk_interval, float &anim_length, float &max_anim_scale, float &event_time, float predelay);
 
bool is_loop = 0; //用于预处理loop的数据，通常为0
bool wait_attack_event = 1; //通常为1
float predelay = 0;
 
int main(){
    
    if (is_loop){preprocess_loop(atk_interval, anim_length, max_anim_scale, event_time, predelay);}
    float scale = calculate_real_scale(atk_interval, anim_length, max_anim_scale);
    cout<<"scale: "<<scale<<endl;
    int predelay = calculate_predelay_frame(event_time, scale);
    cout<<"predelay: "<<predelay<<endl;
    int postdelay = calculate_postdelay_frame(anim_length, scale, predelay);
    cout<<"postdelay: "<<postdelay<<endl;
    int real_duration = calculate_real_duration_in_frame(predelay, postdelay);
    cout<<"real_duration: "<<real_duration<<endl;
    float cooldown = calculate_cooldown_in_frame(atk_interval);
    cout<<"cooldown: "<<cooldown<<endl;
    int real_interval = calculate_real_interval_in_frame(real_duration, cooldown);
    cout<<"real_interval: "<<real_interval;
    return 0;
}
 
void preprocess_loop(float atk_interval, float &anim_length, float &max_anim_scale, float &event_time, float predelay){
    anim_length = atk_interval;
    max_anim_scale = -1.0f;
    event_time = wait_attack_event ? anim_length : predelay;
}
 
float calculate_real_scale(float atk_interval, float anim_length, float max_anim_scale){
    if (rely_on_atk_speed == 0) {return 1.0f;}
    float scale = atk_interval/anim_length;
    if (scale < MIN_ANIM_SCALE){
        scale = MIN_ANIM_SCALE;
    }else if (max_anim_scale != -1 && scale > max_anim_scale){
        scale = max_anim_scale;
    }
    return scale;
}
 
int calculate_predelay_frame(float event_time, float scale){
    int predelay = round(event_time*scale*FRAME_PER_SECOND);
    return max(1, predelay);
}
 
int calculate_postdelay_frame(float anim_length, float scale, int predelay){
    int postdelay = round(anim_length*scale*FRAME_PER_SECOND)-predelay;
    return max(1, postdelay);
}
 
int calculate_real_duration_in_frame(int predelay, int postdelay){
    return predelay+postdelay;
}
 
float calculate_cooldown_in_frame(float atk_interval){
    if (rely_on_atk_speed == 0) {return set_cooldown*FRAME_PER_SECOND;}
    return atk_interval*FRAME_PER_SECOND;
}
 
int calculate_real_interval_in_frame(int real_duration, float cooldown){
    int round_cooldown = reset_cd ? round(cooldown) : ceil(cooldown);
    if (real_duration < round_cooldown) {round_cooldown++;}
    return max(real_duration, round_cooldown);
}